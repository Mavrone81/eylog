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
    lat: Float!
    lng: Float!
    address: String
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    driverId: ID
    customerId: ID
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    status: String
    vehicle: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    address: Location
  }

  type Route {
    optimized_route: [Location]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
  }

  type Mutation {
    createDelivery(
      origin: LocationInput!
      destination: LocationInput!
      customerId: ID
    ): Delivery

    assignDriver(deliveryId: ID!, driverId: ID!): Delivery

    optimizeRoute(locations: [LocationInput]!): Route
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId,
        status: 'PENDING'
      });
      return await delivery.save();
    },
    assignDriver: async (_, { deliveryId, driverId }, context) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Cache driver assignment in Redis
      if (context.redisClient) {
        await context.redisClient.set(`delivery:${deliveryId}:driver`, driverId);
      }

      // Log event to PostgreSQL
      if (context.pgPool) {
        await context.pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );
      }

      return delivery;
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${pythonServiceUrl}/optimize`, { locations });
        return response.data;
      } catch (err) {
        console.error('Optimization service error:', err.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
};

const initServer = async () => {
  const { pgPool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  return { server, pgPool, redisClient };
};

if (require.main === module) {
  initServer().then(({ server, pgPool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({ pgPool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, initServer };
