const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const db = require('./db');
const Customer = require('./models/Customer');
const Driver = require('./models/Driver');
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

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String
    address: String
  }

  type Driver {
    id: ID!
    name: String!
    status: String!
    currentLocation: Location
    phone: String
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
  }

  type Route {
    optimized_locations: [Location]
    distance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    updateDriverStatus(id: ID!, status: String!): Driver
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
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
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(
          process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations },
          { timeout: 10000 }
        );
        return {
          optimized_locations: response.data.optimized_route,
          distance: response.data.distance,
        };
      } catch (error) {
        console.error('Optimization error:', error);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    updateDriverStatus: async (_, { id, status }) => {
      const { redis } = await db.getDB();
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver) {
        await redis.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis } = await db.getDB();
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
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
