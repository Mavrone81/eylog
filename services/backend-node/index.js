const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB } = require('./db');
const axios = require('axios');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

const typeDefs = `#graphql
  type Location {
    lat: Float!
    lng: Float!
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
    driverId: String
    customerId: String
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    vehicleType: String
    currentLocation: Location
    status: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    address: String
  }

  type Route {
    locations: [Location]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: String): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('driverId').populate('customerId'),
    drivers: async () => await Driver.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return {
          locations: response.data.optimized_route,
          status: response.data.status,
          message: response.data.message,
        };
      } catch (error) {
        console.error('Error calling optimization service:', error.message);
        throw new Error('Route optimization failed');
      }
    },
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      await delivery.save();
      return delivery.populate('customerId');
    },
    assignDriver: async (_, { deliveryId, driverId }, { pool, redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Log event in PostgreSQL
      if (pool) {
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );
      }

      // Cache status in Redis
      if (redisClient) {
        await redisClient.set(`delivery_status:${deliveryId}`, 'ASSIGNED');
      }

      return delivery.populate('driverId');
    },
  },
};

const initServer = async () => {
  const { pool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  return { server, pool, redisClient };
};

if (require.main === module) {
  initServer().then(({ server, pool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({ pool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, initServer };
