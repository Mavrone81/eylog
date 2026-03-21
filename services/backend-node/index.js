const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const axios = require('axios');
const { connectDB } = require('./db');

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
    message: String
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): Route
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
        customerId,
        status: 'PENDING',
      });
      return await delivery.save();
    },
    assignDriver: async (_, { deliveryId, driverId }, context) => {
      const { pgPool, redisClient } = context;
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Log event to PostgreSQL
      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
      );

      // Cache status in Redis
      await redisClient.set(`delivery_status:${deliveryId}`, 'ASSIGNED');

      return delivery;
    },
    optimizeRoute: async (_, { locations }) => {
      const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000/optimize';
      try {
        const response = await axios.post(pythonServiceUrl, { locations });
        return response.data;
      } catch (error) {
        console.error('Error calling Python optimization service:', error.message);
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
  connectDB().then((context) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => context,
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
