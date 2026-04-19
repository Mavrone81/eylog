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
    customerId: ID
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
    optimized_locations: [Location]
    distance: Float
    message: String
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
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
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
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return {
          optimized_locations: response.data.optimized_route,
          distance: response.data.distance,
          message: response.data.message
        };
      } catch (err) {
        console.error('Optimization error:', err.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }, { pool }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      await delivery.save();

      // Log event to PostgreSQL
      if (pool) {
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination, customerId })]
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

      // Update driver status to BUSY
      const driver = await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' }, { new: true });

      // Update Redis cache
      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (redisClient) {
        await redisClient.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      await customer.save();
      return customer;
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      await driver.save();
      return driver;
    }
  }
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
