require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { connectDB } = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
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
    address: String!
  }

  type Driver {
    id: ID!
    name: String!
    phone: String!
    status: String!
    vehicleType: String!
    currentLocation: Location
    createdAt: String
    updatedAt: String
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
    createdAt: String
    updatedAt: String
  }

  type Delivery {
    id: ID!
    origin: Location!
    destination: Location!
    status: String!
    driverId: ID
    customerId: ID
    createdAt: String
    updatedAt: String
  }

  type Route {
    locations: [Location]
    distance: Float
  }

  type Query {
    deliveries: [Delivery]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => {
      return await Delivery.find();
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
        return {
          locations: response.data.optimized_route,
          distance: response.data.distance,
        };
      } catch (error) {
        console.error('Error optimizing route:', error);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    createDelivery: async (_, { origin, destination, customerId }, { pool }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      await delivery.save();

      // Log event in PostgreSQL
      if (pool) {
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination, customerId })]
        );
      }

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Update driver status
      const driver = await Driver.findById(driverId);
      if (driver) {
        driver.status = 'BUSY';
        await driver.save();

        // Update Redis cache
        if (redisClient) {
          await redisClient.set(`driver:${driverId}:status`, 'BUSY');
        }
      } else {
        throw new Error('Driver not found');
      }

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      if (!driver) throw new Error('Driver not found');

      if (redisClient) {
        await redisClient.set(`driver:${id}:status`, status);
      }
      return driver;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
      context: async () => ({ pool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
