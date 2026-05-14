require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const db = require('./db');
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
    customer: Customer
    driver: Driver
    status: String!
    origin: Location
    destination: Location
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
    createDriver(name: String!, phone: String!, vehicleType: String): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(
          process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations },
          { timeout: 10000 }
        );
        return {
          optimizedLocations: response.data.optimized_route,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Optimization error:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },

  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customerId);
    },
    driver: async (parent) => {
      if (!parent.driverId) return null;
      if (parent.driver && parent.driver.name) return parent.driver;
      return await Driver.findById(parent.driverId);
    }
  },

  Mutation: {
    createDriver: async (_, args) => {
      return await Driver.create(args);
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redisClient } = await db.getDB();
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      await redisClient.set(`driver:${id}:status`, status);
      return driver;
    },
    createCustomer: async (_, args) => {
      return await Customer.create(args);
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pgPool } = await db.getDB();
      const delivery = await Delivery.create({ customerId, origin, destination });

      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id.toString(), 'CREATED', JSON.stringify(delivery)]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redisClient } = await db.getDB();
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  (async () => {
    await db.getDB();
    const { url } = await startStandaloneServer(server, {
      listen: { port: 4000 },
    });
    console.log(`🚀  Server ready at ${url}`);
  })();
}

module.exports = { typeDefs, resolvers, server };
