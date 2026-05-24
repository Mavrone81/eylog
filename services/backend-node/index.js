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
    lat: Float!
    lng: Float!
    address: String!
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    address: String
  }

  type Driver {
    id: ID!
    name: String
    status: String
    currentLocation: Location
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    customer: Customer
    driver: Driver
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
      await db.getDB();
      return Delivery.find().populate('customer').populate('driver');
    },
    delivery: async (_, { id }) => {
      await db.getDB();
      return Delivery.findById(id).populate('customer').populate('driver');
    },
    optimizeRoute: async (_, { locations }) => {
      const OPTIMIZATION_SERVICE_URL = process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize';
      try {
        const response = await axios.post(OPTIMIZATION_SERVICE_URL, { locations }, { timeout: 10000 });
        return {
          optimizedLocations: response.data.optimized_route,
          totalDistance: response.data.total_distance || 0.0,
        };
      } catch (error) {
        console.error('Error calling optimization service:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis } = await db.getDB();
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redis } = await db.getDB();
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (!driver) throw new Error('Driver not found');
      await redis.set(`driver:${id}:status`, status);
      return driver;
    },
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (parent.driver && parent.driver.name) return parent.driver;
      return Driver.findById(parent.driver);
    },
  },
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
