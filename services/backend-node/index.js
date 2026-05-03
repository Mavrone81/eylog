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
    scheduledTime: String
    actualDeliveryTime: String
    createdAt: String
    updatedAt: String
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
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    createDriver(name: String!, phone: String!, vehicleType: String): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    updateDriverStatus(id: ID!, status: String!): Driver
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => {
      return await Delivery.find().populate('customer').populate('driver');
    },
    delivery: async (_, { id }) => {
      return await Delivery.findById(id).populate('customer').populate('driver');
    },
    drivers: async () => {
      return await Driver.find();
    },
    customers: async () => {
      return await Customer.find();
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return response.data;
      } catch (error) {
        console.error('Error optimizing route:', error);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (!parent.driver) return null;
      if (parent.driver && parent.driver.name) return parent.driver;
      return await Driver.findById(parent.driver);
    },
  },
  Mutation: {
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pgPool } = await getDB();
      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING',
      });
      await delivery.save();

      // Log event to PostgreSQL
      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
      );

      return await delivery.populate('customer');
    },
    createDriver: async (_, { name, phone, vehicleType }) => {
      const driver = new Driver({ name, phone, vehicleType, status: 'OFFLINE' });
      await driver.save();
      return driver;
    },
    createCustomer: async (_, { name, email, phone, address }) => {
      const customer = new Customer({ name, email, phone, address });
      await customer.save();
      return customer;
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redisClient } = await getDB();
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      // Update status in Redis for fast lookup
      await redisClient.set(`driver:${id}:status`, status);

      return driver;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { pgPool, redisClient } = await getDB();
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driver = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();

      // Update Redis status
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      // Log event to PostgreSQL
      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [deliveryId, 'ASSIGNED', JSON.stringify({ driverId })]
      );

      return await delivery.populate(['customer', 'driver']);
    },
  },
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
