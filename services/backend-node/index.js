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
    origin: Location
    destination: Location
    status: String
    driverId: ID
    customerId: ID
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
    address: String
    location: Location
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): RouteOptimizationResponse
  }

  type RouteOptimizationResponse {
    optimized_route: [Location]
    status: String
    message: String
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    createDriver(name: String!, email: String!, phone: String!, vehicleType: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    createCustomer(name: String!, email: String!, phone: String!, address: String!, location: LocationInput!): Customer
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`, {
          locations
        });
        return response.data;
      } catch (err) {
        console.error('Error calling optimization service:', err.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      return await delivery.save();
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }) => {
      return await Driver.findByIdAndUpdate(id, { status }, { new: true });
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    assignDriver: async (_, { deliveryId, driverId }, { pgPool, redisClient }) => {
      const delivery = await Delivery.findByIdAndUpdate(deliveryId, {
        driverId,
        status: 'ASSIGNED',
        updatedAt: new Date()
      }, { new: true });

      if (!delivery) throw new Error('Delivery not found');

      // Update driver status in Redis cache
      if (redisClient) {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      }

      // Log event in PostgreSQL
      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );
      }

      return delivery;
    }
  }
};

async function initServer() {
  const { pgPool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  if (require.main === module) {
    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
      context: async () => ({ pgPool, redisClient })
    });
    console.log(`🚀  Server ready at ${url}`);
  }

  return { typeDefs, resolvers, server };
}

if (require.main === module) {
  initServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers, initServer };
