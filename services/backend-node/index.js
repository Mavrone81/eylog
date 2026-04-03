const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB } = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const axios = require('axios');
require('dotenv').config();

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

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    driverId: ID
    customerId: ID
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    status: String
    currentLocation: Location
    updatedAt: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    updatedAt: String
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
    createDriver(name: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!): Customer
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
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`, { locations });
        return response.data;
      } catch (error) {
        console.error('Error calling optimization service:', error);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }, { db }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId,
        status: 'PENDING'
      });
      await delivery.save();

      // Log event in PostgreSQL
      await db.pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination, customerId })]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { db }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Update Redis cache
      await db.redisClient.set(`delivery:${deliveryId}:status`, 'ASSIGNED');

      // Log event in PostgreSQL
      await db.pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
      );

      return delivery;
    },
    createDriver: async (_, { name }) => {
      const driver = new Driver({ name, status: 'OFFLINE' });
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }, { db }) => {
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      driver.updatedAt = new Date();
      await driver.save();

      // Update status in Redis for fast access
      await db.redisClient.set(`driver:${id}:status`, status);

      return driver;
    },
    createCustomer: async (_, { name, email, phone }) => {
      const customer = new Customer({ name, email, phone });
      return await customer.save();
    }
  }
};

async function initServer() {
  const db = await connectDB();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  return { server, db };
}

if (require.main === module) {
  initServer().then(({ server, db }) => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
      context: async () => ({ db })
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, initServer };
