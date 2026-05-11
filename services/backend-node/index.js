require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { getDB } = require('./db');
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
    address: String
  }

  type Driver {
    id: ID!
    name: String!
    phone: String!
    status: String!
    vehicleType: String!
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
    payload: String
  }

  type Route {
    optimized_route: [Location]
    total_distance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!, payload: String): Delivery
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
    drivers: async () => {
      return await Driver.find();
    },
    customers: async () => {
      return await Customer.find();
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(
          process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations },
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
      return await Driver.create(args);
    },
    updateDriverStatus: async (_, { id, status }, { redis }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver && redis) {
        await redis.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    createCustomer: async (_, args) => {
      return await Customer.create(args);
    },
    createDelivery: async (_, { customerId, origin, destination, payload }, { pool }) => {
      const delivery = await Delivery.create({
        customer: customerId,
        origin,
        destination,
        payload
      });

      if (pool) {
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [delivery.id.toString(), 'CREATED', JSON.stringify({ origin, destination, payload })]
        );
      }

      return await delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }, { redis }) => {
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      const driver = await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' }, { new: true });

      if (driver && redis) {
        await redis.set(`driver:${driverId}:status`, 'BUSY');
      }

      return delivery;
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

const startServer = async () => {
  const { pool, redis } = await getDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
    context: async () => ({ pool, redis })
  });

  console.log(`🚀  Server ready at ${url}`);
};

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers };
