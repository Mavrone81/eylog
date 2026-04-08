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
    customerId: ID!
    driverId: ID
    status: String
    origin: Location
    destination: Location
    createdAt: String
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String!
    phone: String
    status: String
    currentLocation: Location
    updatedAt: String
  }

  type Customer {
    id: ID!
    name: String!
    email: String
    phone: String
    address: String
    createdAt: String
  }

  type RouteResponse {
    optimized_route: [Location]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
    createDriver(name: String!, phone: String): Driver
    createCustomer(name: String!, email: String, phone: String, address: String): Customer
    optimizeRoute(locations: [LocationInput]!): RouteResponse
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
    createDelivery: async (_, { customerId, origin, destination }, { pgPool }) => {
      const delivery = new Delivery({ customerId, origin, destination, status: 'CREATED' });
      await delivery.save();

      // Log event to PostgreSQL
      try {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
        );
      } catch (err) {
        console.error('Failed to log event to PostgreSQL:', err.message);
      }

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Update Redis cache for driver status
      try {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      } catch (err) {
        console.error('Failed to update Redis:', err.message);
      }

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }) => {
      return await Driver.findByIdAndUpdate(id, { status, updatedAt: new Date() }, { new: true });
    },
    createDriver: async (_, { name, phone }) => {
      const driver = new Driver({ name, phone, status: 'AVAILABLE' });
      return await driver.save();
    },
    createCustomer: async (_, { name, email, phone, address }) => {
      const customer = new Customer({ name, email, phone, address });
      return await customer.save();
    },
    optimizeRoute: async (_, { locations }) => {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
      try {
        const response = await axios.post(`${pythonServiceUrl}/optimize`, { locations });
        return response.data;
      } catch (err) {
        console.error('Error calling Python optimization service:', err.message);
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
