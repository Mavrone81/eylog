require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB } = require('./db');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const Delivery = require('./models/Delivery');
const axios = require('axios');

const typeDefs = `#graphql
  type Location {
    lat: Float
    lng: Float
    address: String
  }

  input LocationInput {
    lat: Float!
    lng: Float!
    address: String!
  }

  type Driver {
    id: ID!
    name: String!
    phone: String!
    status: String!
    vehicleType: String!
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
  }

  type Delivery {
    id: ID!
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location!
    destination: Location!
    estimatedDeliveryTime: String
    actualDeliveryTime: String
    createdAt: String
    updatedAt: String
  }

  type Route {
    locations: [Location]
    totalDistance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer driver'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }, { pythonServiceUrl }) => {
      try {
        const response = await axios.post(`${pythonServiceUrl}/optimize`, { locations });
        return {
          locations: response.data.optimized_route,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Error calling optimization service:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    createDelivery: async (_, { customerId, origin, destination }, { pgPool }) => {
      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });
      await delivery.save();

      // Log event to PostgreSQL
      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
      );

      return await delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driver = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Update driver status to BUSY
      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });

      // Update Redis cache
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      return await delivery.populate('customer driver');
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver) {
        await redisClient.set(`driver:${id}:status`, status);
      }
      return driver;
    }
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (!parent.driver) return null;
      if (parent.driver.name) return parent.driver;
      return await Driver.findById(parent.driver);
    }
  }
};

const startServer = async () => {
  const { pgPool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({
      pgPool,
      redisClient,
      pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'
    }),
  });

  console.log(`🚀  Server ready at ${url}`);
};

if (require.main === module) {
  startServer();
}

module.exports = { typeDefs, resolvers };
