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
    status: String
    vehicleType: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String
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
    createDriver(name: String!, phone: String!, vehicleType: String): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customerId').populate('driverId'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customerId').populate('driverId'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
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
    },
  },
  Delivery: {
    customer: (parent) => parent.customerId.name ? parent.customerId : Customer.findById(parent.customerId),
    driver: (parent) => {
      if (!parent.driverId) return null;
      return parent.driverId.name ? parent.driverId : Driver.findById(parent.driverId);
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

      const { redisClient } = await getDB();
      await redisClient.set(`driver:${id}:status`, status);

      return driver;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({ customerId, origin, destination, status: 'PENDING' });
      await delivery.save();

      const { pool } = await getDB();
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();

      const { redisClient, pool } = await getDB();
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [deliveryId, 'ASSIGNED', JSON.stringify({ driverId })]
      );

      return delivery;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: parseInt(process.env.PORT) || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
