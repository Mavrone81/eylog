require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { connectDB } = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

const typeDefs = `#graphql
  type Location {
    lat: Float!
    lng: Float!
    address: String!
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

  type Delivery {
    id: ID!
    customerId: ID!
    driverId: ID
    status: String!
    origin: Location!
    destination: Location!
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
  }

  type Route {
    optimizedLocations: [Location]
    totalDistance: Float
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('driverId customerId'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return {
          optimizedLocations: response.data.optimized_route,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Error calling optimization service:', error);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createDelivery: async (_, { customerId, origin, destination }, { pgPool }) => {
      const delivery = new Delivery({ customerId, origin, destination });
      await delivery.save();

      // Log event to PostgreSQL
      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
        );
      }

      return delivery.populate('driverId customerId');
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Update driver status in MongoDB and Redis
      const driver = await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' }, { new: true });
      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      return delivery.populate('driverId customerId');
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (redisClient) {
        await redisClient.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    }
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pgPool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({ pgPool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
