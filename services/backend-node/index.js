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
    customerId: ID
    driverId: ID
    createdAt: String
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    phone: String
    status: String
    vehicleType: String
    currentLocation: Location
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
    message: String
    status: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${pythonServiceUrl}/optimize`, { locations });
        return response.data;
      } catch (err) {
        console.error('Failed to call route optimization service:', err.message);
        return { status: 'error', message: err.message };
      }
    },
  },
  Mutation: {
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (redisClient) {
        await redisClient.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }
      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });

      return delivery;
    },
    createDelivery: async (_, { origin, destination, customerId }, { pgPool }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId,
        status: 'PENDING'
      });
      await delivery.save();

      // Log to PostgreSQL
      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
        );
      }

      // Call Python route optimization service (example)
      try {
        const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
        await axios.post(`${pythonServiceUrl}/optimize`, {
          locations: [origin, destination]
        });
      } catch (err) {
        console.error('Failed to call route optimization service:', err.message);
      }

      return delivery;
    }
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
