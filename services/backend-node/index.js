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
    name: String
    email: String
    status: String
    currentLocation: Location
    vehicleType: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    address: Location
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String
    origin: Location
    destination: Location
    estimatedDeliveryTime: String
    actualDeliveryTime: String
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
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => {
      return await Delivery.find().populate('customer').populate('driver');
    },
    delivery: async (_, { id }) => {
      return await Delivery.findById(id).populate('customer').populate('driver');
    },
    drivers: async () => {
      return await Driver.find();
    },
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
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
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

      const { redis } = await db.getDB();
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return await delivery.populate('customer driver');
    },
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      const { redis } = await db.getDB();
      await redis.set(`driver:${id}:status`, status);

      return driver;
    }
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (parent.driver && parent.driver.name) return parent.driver;
      if (!parent.driver) return null;
      return await Driver.findById(parent.driver);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
