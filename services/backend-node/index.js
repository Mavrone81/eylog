require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { connectDB } = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
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

  type Delivery {
    id: ID!
    status: String!
    origin: Location!
    destination: Location!
    driverId: ID
    customerId: ID!
    updatedAt: String
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

  type Route {
    optimized_route: [Location]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
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
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return response.data;
      } catch (err) {
        console.error('Optimization error:', err);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }, { pgPool }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      await delivery.save();

      // Log to PostgreSQL
      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
        );
      }

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Update Redis cache
      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }) => {
      return await Driver.findByIdAndUpdate(id, { status }, { new: true });
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pgPool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
      context: async () => ({ pgPool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
