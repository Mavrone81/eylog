require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');

const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

const typeDefs = `#graphql
  type Location {
    lat: Float
    lng: Float
  }

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
    stops: [String]
    estimatedTime: Int
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
    delivery(id: ID!): Delivery
  }

  type Mutation {
    createDelivery(status: String!, origin: String!, destination: String!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('driverId customerId'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('driverId customerId'),
  },
  Delivery: {
    driver: (parent) => parent.driverId,
    customer: (parent) => parent.customerId,
  },
  Mutation: {
    createDelivery: async (_, { status, origin, destination, customerId }, { pgPool }) => {
      const delivery = new Delivery({ status, origin, destination, customerId });
      await delivery.save();

      // Log event to PostgreSQL
      await pgPool.query('INSERT INTO delivery_events(delivery_id, event_type) VALUES($1, $2)', [delivery.id, 'CREATED']);

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findByIdAndUpdate(deliveryId, { driverId }, { new: true }).populate('driverId customerId');

      if (!delivery) {
        throw new Error('Delivery not found');
      }

      // Cache delivery status in Redis
      await redisClient.set(`delivery_status:${deliveryId}`, delivery.status);

      return delivery;
    }
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('MongoDB connected');

    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
    });

    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

const startServer = async () => {
  const { pgPool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ pgPool, redisClient }),
  });
  console.log(`🚀  Server ready at ${url}`);
};

if (require.main === module) {
  startServer();
}

module.exports = { typeDefs, resolvers, startServer };
