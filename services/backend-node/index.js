require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB } = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const axios = require('axios');

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
    items: [String]
    driverId: ID
    customerId: ID
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    vehicleType: String
    status: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(
      origin: LocationInput!
      destination: LocationInput!
      items: [String]!
      customerId: ID!
    ): Delivery

    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
    createDriver(name: String!, vehicleType: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!): Customer

    optimizeRoute(locations: [LocationInput]!): [Location]
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
    createDriver: async (_, { name, vehicleType }) => {
      const driver = new Driver({ name, vehicleType, status: 'OFFLINE' });
      return await driver.save();
    },
    createCustomer: async (_, { name, email, phone }) => {
      const customer = new Customer({ name, email, phone });
      return await customer.save();
    },
    createDelivery: async (_, { origin, destination, items, customerId }, { pgPool }) => {
      const delivery = new Delivery({
        origin,
        destination,
        items,
        customerId,
        status: 'CREATED',
      });
      const savedDelivery = await delivery.save();

      // Log event to PostgreSQL
      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [savedDelivery.id, 'CREATED', JSON.stringify({ origin, destination, items, customerId })]
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

      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      return delivery;
    },
    updateDriverStatus: async (_, { driverId, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(driverId, { status }, { new: true });
      if (!driver) throw new Error('Driver not found');

      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, status);
      }

      return driver;
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, {
          locations,
        });
        return response.data.optimized_route;
      } catch (err) {
        console.error('Error calling optimization service:', err.message);
        throw new Error('Failed to optimize route');
      }
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
      listen: { port: 4000 },
      context: async () => ({ pgPool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
