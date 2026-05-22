const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const db = require('./db');
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
    name: String!
    email: String!
    status: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    address: Location
  }

  type Delivery {
    id: ID!
    orderNumber: String!
    status: String
    origin: Location
    destination: Location
    customer: Customer
    driver: Driver
  }

  type Route {
    locations: [Location]
    distance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(
      orderNumber: String!,
      customerId: ID!,
      origin: LocationInput!,
      destination: LocationInput!
    ): Delivery

    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(
          process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations },
          { timeout: 10000 }
        );
        return {
          locations: response.data.optimized_route,
          distance: response.data.total_distance || 0
        };
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDelivery: async (_, args) => {
      const delivery = new Delivery({
        orderNumber: args.orderNumber,
        customer: args.customerId,
        origin: args.origin,
        destination: args.destination,
        status: 'PENDING'
      });
      await delivery.save();
      return await delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redisClient } = await db.getDB();
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redisClient } = await db.getDB();
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver) {
        await redisClient.set(`driver:${id}:status`, status);
      }
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
  (async () => {
    await db.getDB();
    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    });
    console.log(`🚀  Server ready at ${url}`);
  })();
}

module.exports = { typeDefs, resolvers, server };
