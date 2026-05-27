const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
require('dotenv').config();

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
    email: String!
    status: String!
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    address: String!
    phone: String
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String!
    origin: String!
    destination: String!
    estimatedTime: String
    actualTime: String
    createdAt: String
    updatedAt: String
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
    createDriver(name: String!, email: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    createCustomer(name: String!, email: String!, address: String!, phone: String): Customer
    createDelivery(customerId: ID!, origin: String!, destination: String!): Delivery
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
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, { locations }, { timeout: 10000 });
        return {
          optimizedLocations: response.data.optimized_route,
          totalDistance: response.data.total_distance || 0,
        };
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Delivery: {
    customer: (parent) => parent.customerId || parent.customer,
    driver: (parent) => parent.driverId || parent.driver,
  },
  Mutation: {
    createDriver: async (_, { name, email }) => {
      const driver = new Driver({ name, email });
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');
      driver.status = status;
      await driver.save();
      const { redis } = await db.getDB();
      await redis.set(`driver:${id}:status`, status);
      return driver;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const [delivery, driver] = await Promise.all([
        Delivery.findById(deliveryId),
        Driver.findById(driverId),
      ]);
      if (!delivery || !driver) throw new Error('Delivery or Driver not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();

      const { redis } = await db.getDB();
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return await delivery.populate('customerId driverId');
    },
    createCustomer: async (_, { name, email, address, phone }) => {
      const customer = new Customer({ name, email, address, phone });
      return await customer.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({ customerId, origin, destination });
      return await (await delivery.save()).populate('customerId');
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  (async () => {
    await db.getDB();
    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    });
    console.log(`🚀  Server ready at ${url}`);
  })();
}

module.exports = { typeDefs, resolvers, server };
