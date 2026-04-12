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
    address: String
  }

  input LocationInput {
    lat: Float!
    lng: Float!
    address: String
  }

  type Delivery {
    id: ID!
    origin: Location!
    destination: Location!
    status: String!
    driverId: ID
    customerId: ID
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String!
    phone: String!
    status: String!
    vehicleType: String
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
    optimizedPath: [Location]
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    createDriver(name: String!, phone: String!, vehicleType: String): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    optimizeRoute(locations: [LocationInput]!): Route
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }, { pool }) => {
      const delivery = new Delivery({ origin, destination, customerId, status: 'PENDING' });
      await delivery.save();

      // Log to PostgreSQL
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination, customerId })]
      );

      return delivery;
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      await driver.save();
      return driver;
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status, updatedAt: new Date() }, { new: true });
      if (driver && redisClient) {
        await redisClient.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient, pool }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Update Driver Status in Redis
      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      // Log to PostgreSQL
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [deliveryId, 'ASSIGNED', JSON.stringify({ driverId })]
      );

      return delivery;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      await customer.save();
      return customer;
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return {
          optimizedPath: response.data.optimized_route,
          message: response.data.message
        };
      } catch (error) {
        console.error('Route optimization error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
      context: async () => ({ pool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
