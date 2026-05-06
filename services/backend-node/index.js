const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

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
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location!
    destination: Location!
  }

  type Route {
    optimized_locations: [Location]
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
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, { locations });
        return {
          optimized_locations: response.data.optimized_route,
          total_distance: response.data.total_distance
        };
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });
      const savedDelivery = await delivery.save();

      const { pool } = await getDB();
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [savedDelivery.id, 'CREATED', JSON.stringify({ origin, destination })]
      );

      return await savedDelivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { status: 'BUSY' },
        { new: true }
      );

      const { redisClient } = await getDB();
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
    updateDriverStatus: async (_, { driverId, status }) => {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      const { redisClient } = await getDB();
      await redisClient.set(`driver:${driverId}:status`, status);

      return driver;
    }
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
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function startServer() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT) || 4000 },
  });
  console.log(`🚀  Server ready at ${url}`);
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers, server };
