const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const { connectDB } = require('./db');
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
    address: String!
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    driverId: ID
    customerId: ID
  }

  type Driver {
    id: ID!
    name: String
    email: String
    status: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
  }

  type Route {
    optimized_route: [Location]
    status: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    optimizeRoute(deliveryIds: [ID]!): Route
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
    createDelivery: async (_, { origin, destination, customerId }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      return await delivery.save();
    },
    assignDriver: async (_, { deliveryId, driverId }, { pgPool, redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Log to PostgreSQL
      await pgPool.query('INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)', [
        deliveryId,
        'DRIVER_ASSIGNED',
        JSON.stringify({ driverId }),
      ]);

      // Cache in Redis
      await redisClient.set(`delivery_status:${deliveryId}`, 'ASSIGNED');

      return delivery;
    },
    optimizeRoute: async (_, { deliveryIds }) => {
      const deliveries = await Delivery.find({ _id: { $in: deliveryIds } });
      const locations = deliveries.map(d => d.destination);

      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return response.data;
      } catch (error) {
        console.error('Route optimization service error:', error);
        throw new Error('Failed to optimize route');
      }
    },
  },
};

const initServer = async () => {
  const { pgPool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  if (require.main === module) {
    const { url } = await startStandaloneServer(server, {
      listen: { port: parseInt(process.env.PORT) || 4000 },
      context: async () => ({ pgPool, redisClient }),
    });
    console.log(`🚀  Server ready at ${url}`);
  }

  return { server, pgPool, redisClient };
};

if (require.main === module) {
  initServer();
}

module.exports = { typeDefs, resolvers, initServer };
