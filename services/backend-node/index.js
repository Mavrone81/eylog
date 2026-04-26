require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const axios = require('axios');
const { connectDB } = require('./db');

// Models
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

const typeDefs = `#graphql
  type Location {
    lat: Float!
    lng: Float!
    address: String!
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
    optimizedLocations: [Location]
    totalDistance: Float
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, phone: String!, vehicleType: String!, lat: Float!, lng: Float!, address: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return {
          optimizedLocations: response.data.optimized_locations,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Error calling optimization service:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
      const { name, phone, vehicleType, lat, lng, address } = args;
      return await Driver.create({
        name,
        phone,
        vehicleType,
        currentLocation: { lat, lng, address },
        status: 'OFFLINE'
      });
    },
    createCustomer: async (_, args) => {
      return await Customer.create(args);
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = await Delivery.create({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });

      if (global.pgClient) {
        await global.pgClient.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
        );
      }

      return await delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });

      if (global.redisClient) {
        await global.redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      return delivery;
    },
    updateDriverStatus: async (_, { driverId, status }) => {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      if (global.redisClient) {
        await global.redisClient.set(`driver:${driverId}:status`, status);
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
  connectDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
