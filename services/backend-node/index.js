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
    lat: Float
    lng: Float
    address: String
  }

  input LocationInput {
    lat: Float
    lng: Float
    address: String
  }

  type Driver {
    id: ID!
    name: String
    phone: String
    status: String
    vehicleType: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    address: String
  }

  type Delivery {
    id: ID!
    orderId: String
    customerId: ID
    customer: Customer
    driverId: ID
    driver: Driver
    status: String
    origin: Location
    destination: Location
    estimatedDeliveryTime: String
    actualDeliveryTime: String
  }

  type Route {
    optimizedLocations: [Location]
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
    createDriver(name: String!, phone: String!, vehicleType: String!, currentLocation: LocationInput): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(orderId: String!, customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customerId').populate('driverId'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customerId').populate('driverId'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${pythonServiceUrl}/optimize`, { locations });
        return {
          optimizedLocations: response.data.optimized_route,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Error calling Python optimization service:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
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
    createDelivery: async (_, args, { pgPool }) => {
      const delivery = new Delivery(args);
      const savedDelivery = await delivery.save();
      await savedDelivery.populate('customerId');

      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [savedDelivery.id, 'CREATED', JSON.stringify(savedDelivery)]
        );
      }
      return savedDelivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient, pgPool }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();

      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [deliveryId, 'ASSIGNED', JSON.stringify({ driverId })]
        );
      }

      return await delivery.populate('driverId');
    }
  },
  Delivery: {
    customer: async (parent) => await Customer.findById(parent.customerId),
    driver: async (parent) => parent.driverId ? await Driver.findById(parent.driverId) : null,
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  const start = async () => {
    const { pgPool, redisClient } = await connectDB();
    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
      context: async () => ({ pgPool, redisClient }),
    });
    console.log(`🚀  Server ready at ${url}`);
  };
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers, server };
