require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const db = require('./db');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const Delivery = require('./models/Delivery');

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
    name: String!
    phone: String!
    status: String!
    vehicleType: String
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
  }

  type Route {
    locations: [Location]
    distance: Float
  }

  type Query {
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, phone: String!, vehicleType: String): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(
          process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations },
          { timeout: 10000 }
        );
        return {
          locations: response.data.optimized_route,
          distance: response.data.total_distance
        };
      } catch (error) {
        console.error('Optimization error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      const { redisClient } = await db.getDB();
      await redisClient.set(`driver:${id}:status`, status);

      return driver;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({ customer: customerId, origin, destination });
      await delivery.save();

      const { pgPool } = await db.getDB();
      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ customerId, origin, destination })]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driver = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();

      const { redisClient } = await db.getDB();
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    }
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (!parent.driver) return null;
      if (parent.driver && parent.driver.name) return parent.driver;
      return await Driver.findById(parent.driver);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function startServer() {
  await db.getDB();
  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
  });
  console.log(`🚀  Server ready at ${url}`);
}

if (require.main === module) {
  startServer();
}

module.exports = { typeDefs, resolvers, server };
