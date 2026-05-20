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
    lat: Float!
    lng: Float!
    address: String!
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
    address: Location
  }

  type Delivery {
    id: ID!
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location
    destination: Location
    scheduledAt: String
    completedAt: String
  }

  type Route {
    optimized_route: [Location]
    total_distance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
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
      const url = process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize';
      try {
        const response = await axios.post(url, { locations }, { timeout: 10000 });
        return response.data;
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redisClient } = await db.getDB();
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      if (delivery) {
        await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }
      return delivery;
    },
    updateDriverStatus: async (_, { driverId, status }) => {
      const { redisClient } = await db.getDB();
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { status },
        { new: true }
      );
      if (driver) {
        await redisClient.set(`driver:${driverId}:status`, status);
      }
      return driver;
    },
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
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.getDB().then(() => {
    return startStandaloneServer(server, {
      listen: { port: 4000 },
    });
  }).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  }).catch(err => {
    console.error('Failed to start server:', err);
  });
}

module.exports = { typeDefs, resolvers, server };
