const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const connectDB = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const axios = require('axios');
require('dotenv').config();

const typeDefs = `#graphql
  type Location {
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
  }

  type Driver {
    id: ID!
    name: String
    status: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    address: String
  }

  type Route {
    optimized_route: [Location]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
  }

  input LocationInput {
    lat: Float!
    lng: Float!
    address: String
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    optimizeRoute(deliveryIds: [ID]!): Route
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId
      });
      await delivery.save();
      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient, pgPool }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Update Redis cache
      await redisClient.set(`delivery:${deliveryId}:status`, 'ASSIGNED');

      // Log event to PostgreSQL
      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
      );

      return delivery;
    },
    optimizeRoute: async (_, { deliveryIds }) => {
      const deliveries = await Delivery.find({ _id: { $in: deliveryIds } });
      const locations = deliveries.map(d => d.destination);

      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`, {
          locations
        });
        return response.data;
      } catch (err) {
        console.error('Optimization Service Error:', err.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
};

let server;

const startServer = async () => {
  const { pgPool, redisClient } = await connectDB();

  server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ pgPool, redisClient }),
  });
  console.log(`🚀  Server ready at ${url}`);
  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { typeDefs, resolvers, startServer };
