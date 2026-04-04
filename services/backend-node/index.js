const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

const typeDefs = `#graphql
  type Location {
    address: String
    lat: Float
    lng: Float
  }

  input LocationInput {
    address: String
    lat: Float
    lng: Float
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    customerId: ID
    driverId: ID
    estimatedDeliveryTime: String
    actualDeliveryTime: String
    createdAt: String
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    email: String
    phone: String
    status: String
    currentLocation: Location
    vehicleType: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    address: String
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
    driver(id: ID!): Driver
    customers: [Customer]
    customer(id: ID!): Customer
  }

  type Mutation {
    createDelivery(
      status: String
      origin: LocationInput!
      destination: LocationInput!
      customerId: ID!
    ): Delivery

    createDriver(
      name: String!
      email: String!
      phone: String
      vehicleType: String
    ): Driver

    createCustomer(
      name: String!
      email: String!
      phone: String
      address: String
    ): Customer

    assignDriver(deliveryId: ID!, driverId: ID!): Delivery

    updateDriverStatus(driverId: ID!, status: String!): Driver

    optimizeRoute(locations: [LocationInput]!): Route
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
    customer: async (_, { id }) => await Customer.findById(id),
  },
  Mutation: {
    createDelivery: async (_, args, context) => {
      const delivery = new Delivery(args);
      await delivery.save();

      // Log event in PostgreSQL
      await context.pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify(args)]
      );

      return delivery;
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      await driver.save();
      return driver;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      await customer.save();
      return customer;
    },
    assignDriver: async (_, { deliveryId, driverId }, context) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Update driver status in Redis
      await context.redisClient.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
    updateDriverStatus: async (_, { driverId, status }, context) => {
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { status },
        { new: true }
      );
      // Update Redis cache
      await context.redisClient.set(`driver:${driverId}:status`, status);
      return driver;
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(
          process.env.PYTHON_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations }
        );
        return response.data;
      } catch (error) {
        console.error('Error calling optimization service:', error.message);
        throw new Error('Route optimization failed');
      }
    },
  },
};

const initServer = async () => {
  const { pgPool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ pgPool, redisClient }),
  });

  console.log(`🚀  Server ready at ${url}`);
};

if (require.main === module) {
  initServer();
}

module.exports = { typeDefs, resolvers, initServer };
