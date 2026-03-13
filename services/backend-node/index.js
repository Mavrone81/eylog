const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const connectDB = require('./db');

const typeDefs = `#graphql
  type Delivery {
    id: ID!
    status: String
    origin: String
    destination: String
    driver: Driver
    customer: Customer
  }

  type Driver {
    id: ID!
    name: String
    vehicleType: String
    status: String
  }

  type Customer {
    id: ID!
    name: String
    address: String
    email: String
  }

  type Route {
    locations: [String]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    optimizeRoute(locations: [[Float]!]!): Route
  }

  type Mutation {
    createDelivery(status: String!, origin: String!, destination: String!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async (_, __, { models }) => {
      return await models.Delivery.find().populate('driverId').populate('customerId');
    },
    delivery: async (_, { id }, { models, redisClient }) => {
      const cached = await redisClient.get(`delivery:${id}`);
      if (cached) return JSON.parse(cached);
      const delivery = await models.Delivery.findById(id).populate('driverId').populate('customerId');
      if (delivery) {
        await redisClient.set(`delivery:${id}`, JSON.stringify(delivery), { EX: 3600 });
      }
      return delivery;
    },
    drivers: async (_, __, { models }) => {
      return await models.Driver.find();
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.PYTHON_SERVICE_URL || 'http://localhost:5000/optimize', {
          locations
        });
        return {
          locations: response.data.optimized_route.map(loc => loc.join(',')),
          status: response.data.status,
          message: response.data.message
        };
      } catch (error) {
        return {
          status: 'error',
          message: error.message
        };
      }
    }
  },
  Mutation: {
    createDelivery: async (_, { status, origin, destination, customerId }, { models }) => {
      const delivery = new models.Delivery({ status, origin, destination, customerId });
      await delivery.save();
      return await models.Delivery.findById(delivery._id).populate('driverId').populate('customerId');
    },
    assignDriver: async (_, { deliveryId, driverId }, { models, pgPool, redisClient }) => {
      const delivery = await models.Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      await delivery.save();

      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type) VALUES ($1, $2)',
        [deliveryId, 'DRIVER_ASSIGNED']
      );

      await redisClient.del(`delivery:${deliveryId}`);

      return await models.Delivery.findById(deliveryId).populate('driverId').populate('customerId');
    }
  },
  Delivery: {
    driver: (parent) => parent.driverId,
    customer: (parent) => parent.customerId,
  }
};

const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pgPool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({
        models: { Delivery, Driver, Customer },
        pgPool,
        redisClient
      })
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
