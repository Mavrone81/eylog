const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// Models
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

// Database connections
const connectDB = async () => {
  try {
    // MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // PostgreSQL connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
    });
    // Skip verification for now as DB might not be up
    // await pgPool.query('SELECT NOW()');
    console.log('PostgreSQL configuration initialized');
    return { pgPool };
  } catch (error) {
    console.error('Database connection error:', error);
    // Don't exit if DBs are not available, just log
    return { pgPool: null };
  }
};

const typeDefs = `#graphql
  type Delivery {
    id: ID!
    orderId: String
    status: String
    origin: Location
    destination: Location
    driver: Driver
    customer: Customer
    optimizedRoute: [Coordinate]
  }

  type Location {
    lat: Float
    lng: Float
    address: String
  }

  type Coordinate {
    lat: Float
    lng: Float
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

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(
      orderId: String!
      origin: LocationInput!
      destination: LocationInput!
      customerId: ID!
    ): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }

  input LocationInput {
    lat: Float
    lng: Float
    address: String
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('driverId customerId'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
  },
  Mutation: {
    createDelivery: async (_, { orderId, origin, destination, customerId }) => {
      try {
        // Prepare locations for optimization
        const locations = [
          { lat: origin.lat, lng: origin.lng },
          { lat: destination.lat, lng: destination.lng }
        ];

        // Call Python optimization service
        const pythonUrl = process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize';
        const response = await axios.post(pythonUrl, { locations });
        const optimizedRoute = response.data.optimized_route;

        const delivery = new Delivery({
          orderId,
          origin,
          destination,
          customerId,
          optimizedRoute,
          status: 'PENDING'
        });

        await delivery.save();
        return delivery.populate('customerId');
      } catch (error) {
        console.error('Error in createDelivery:', error.message);
        throw new Error('Failed to create and optimize delivery');
      }
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      try {
        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { driverId, status: 'ASSIGNED' },
          { new: true }
        ).populate('driverId customerId');
        return delivery;
      } catch (error) {
        console.error('Error in assignDriver:', error.message);
        throw new Error('Failed to assign driver');
      }
    }
  },
  Delivery: {
      driver: (parent) => parent.driverId,
      customer: (parent) => parent.customerId,
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pgPool }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({ pgPool }),
      // startStandaloneServer supports middleware via express application configuration
      // but the standalone version simplified this.
      // For real CORS in production we'd use a full Express setup with Apollo Middleware.
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
