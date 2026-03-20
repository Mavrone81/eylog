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
    lat: Float!
    lng: Float!
    address: String!
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    customerId: ID
    driverId: ID
    createdAt: String
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    email: String
    phone: String
    vehicleType: String
    status: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
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
    customer(id: ID!): Customer
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!, driverId: ID): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    optimizeRoute(deliveryIds: [ID]!): Route
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
    customer: async (_, { id }) => await Customer.findById(id),
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId, driverId }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId,
        driverId,
        status: 'PENDING'
      });
      await delivery.save();
      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { pgPool, redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Log event to PostgreSQL
      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type) VALUES ($1, $2)',
          [deliveryId, 'DRIVER_ASSIGNED']
        );
      }

      // Update Redis cache
      if (redisClient) {
        await redisClient.set(`delivery:${deliveryId}:status`, 'ASSIGNED');
      }

      return delivery;
    },
    optimizeRoute: async (_, { deliveryIds }) => {
      const deliveries = await Delivery.find({ _id: { $in: deliveryIds } });
      const locations = deliveries.map(d => d.destination);

      try {
        const response = await axios.post(
          process.env.PYTHON_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations }
        );
        return response.data;
      } catch (error) {
        console.error('Error calling Python optimization service:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
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
