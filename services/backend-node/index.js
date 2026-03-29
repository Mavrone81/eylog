const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB } = require('./db');
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
    customerId: ID
    driverId: ID
    estimatedTime: String
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    email: String
    status: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    addresses: [Location]
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
      customerId: ID!
    ): Delivery

    assignDriver(
      deliveryId: ID!
      driverId: ID!
    ): Delivery

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
    createDelivery: async (_, { origin, destination, customerId }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId,
        status: 'PENDING'
      });
      return await delivery.save();
    },
    assignDriver: async (_, { deliveryId, driverId }, { pgPool, redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Log event in PostgreSQL
      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );
      }

      // Update Redis cache
      if (redisClient) {
        await redisClient.set(`delivery:${deliveryId}:status`, 'ASSIGNED');
      }

      return delivery;
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`, {
          locations
        });
        return response.data.optimized_route;
      } catch (error) {
        console.error('Error calling optimization service:', error);
        throw new Error('Failed to optimize route');
      }
    }
  },
};

const initServer = async () => {
  let dbContext = {};
  if (process.env.NODE_ENV !== 'test') {
    dbContext = await connectDB();
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  return { server, dbContext };
};

if (require.main === module) {
  initServer().then(({ server, dbContext }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => dbContext
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, initServer };
