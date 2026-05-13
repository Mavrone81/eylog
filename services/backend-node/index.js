require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { getDB } = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

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
    status: String!
    vehicleType: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: Location
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String!
    origin: Location
    destination: Location
    estimatedDeliveryTime: String
    actualDeliveryTime: String
  }

  type Route {
    optimized_route: [Location]
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
    createCustomer(name: String!, email: String!, phone: String!, address: LocationInput!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customerId driverId'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customerId driverId'),
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
    customer: (parent) => parent.customerId && (parent.customerId.name ? parent.customerId : Customer.findById(parent.customerId)),
    driver: (parent) => parent.driverId && (parent.driverId.name ? parent.driverId : Driver.findById(parent.driverId)),
  },
  Mutation: {
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver) {
        const { redis } = await getDB();
        await redis.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDelivery: async (_, args) => {
      const delivery = new Delivery(args);
      const savedDelivery = await delivery.save();

      const { pg } = await getDB();
      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [savedDelivery.id, 'CREATED', JSON.stringify(savedDelivery)]
      );

      return savedDelivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driverId, status: 'ASSIGNED' },
        { new: true }
      );

      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { status: 'BUSY' },
        { new: true }
      );

      if (driver) {
        const { redis } = await getDB();
        await redis.set(`driver:${driverId}:status`, 'BUSY');
      }

      const { pg } = await getDB();
      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
      );

      return delivery.populate('customerId driverId');
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  (async () => {
    await getDB();
    const { url } = await startStandaloneServer(server, {
      listen: { port: parseInt(process.env.PORT) || 4000 },
    });
    console.log(`🚀  Server ready at ${url}`);
  })();
}

module.exports = { typeDefs, resolvers, server };
