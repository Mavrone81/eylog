require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB } = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const axios = require('axios');

const typeDefs = `#graphql
  type Location {
    lat: Float
    lng: Float
    address: String
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
    orderId: String!
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location!
    destination: Location!
    estimatedTime: String
    actualTime: String
  }

  type Route {
    locations: [Location]
    distance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    driver(id: ID!): Driver
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(orderId: String!, customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customerId').populate('driverId'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customerId').populate('driverId'),
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`, {
          locations
        });
        return {
          locations: response.data.optimized_route,
          distance: response.data.distance
        };
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Delivery: {
    customer: async (delivery) => {
      if (delivery.customerId && delivery.customerId.name) return delivery.customerId;
      return await Customer.findById(delivery.customerId);
    },
    driver: async (delivery) => {
      if (delivery.driverId && delivery.driverId.name) return delivery.driverId;
      return delivery.driverId ? await Driver.findById(delivery.driverId) : null;
    },
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
    createDelivery: async (_, { orderId, customerId, origin, destination }, { pool }) => {
      const delivery = new Delivery({
        orderId,
        customerId,
        origin,
        destination,
        status: 'PENDING'
      });
      const savedDelivery = await delivery.save();

      // Log event in PostgreSQL
      if (pool) {
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [savedDelivery.id, 'CREATED', JSON.stringify({ orderId, customerId })]
        );
      }

      return savedDelivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Update driver status in Redis cache
      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      // Also update in MongoDB
      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (redisClient && driver) {
        await redisClient.set(`driver:${id}:status`, status);
      }
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
      listen: { port: 4000 },
      context: async () => ({ pool, redisClient })
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
