require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const { connectDB } = require('./db');

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
    email: String
    status: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    address: String
    phone: String
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
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    createDriver(name: String!, email: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, address: String, phone: String): Customer
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
    createDelivery: async (_, { origin, destination, customerId }, context) => {
      const delivery = new Delivery({ origin, destination, customerId, status: 'CREATED' });
      await delivery.save();

      // Log to PostgreSQL
      if (context.db && context.db.pool) {
        await context.db.pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination, customerId })]
        );
      }

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, context) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Update Redis cache
      if (context.db && context.db.redisClient) {
        await context.db.redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      return delivery;
    },
    createDriver: async (_, { name, email }) => {
      const driver = new Driver({ name, email, status: 'AVAILABLE' });
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }) => {
      return await Driver.findByIdAndUpdate(id, { status }, { new: true });
    },
    createCustomer: async (_, { name, email, address, phone }) => {
      const customer = new Customer({ name, email, address, phone });
      return await customer.save();
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(
          `${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`,
          { locations }
        );
        return response.data;
      } catch (error) {
        console.error('Route optimization error:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
};

const initServer = async () => {
  let db = null;
  // Skip DB connection if NODE_ENV is test to allow schema verification
  if (process.env.NODE_ENV !== 'test') {
    db = await connectDB();
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  return { server, db };
};

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
