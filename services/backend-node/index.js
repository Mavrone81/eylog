require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');

// Models
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

// Database connections
const connectDB = async () => {
  let pool, redisClient;
  try {
    // MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('Connected to MongoDB');

    // PostgreSQL
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
    });
    console.log('Connected to PostgreSQL');

    // Redis
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis');

  } catch (err) {
    console.error('Database connection error:', err);
    // Return empty/null objects instead of undefined to avoid destructuring crash
    return { pool: pool || null, redisClient: redisClient || null };
  }
  return { pool, redisClient };
};

const typeDefs = `#graphql
  type Location {
    lat: Float
    lng: Float
    address: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
  }

  type Driver {
    id: ID!
    name: String
    status: String
    currentLocation: Location
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    customer: Customer
    driver: Driver
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    delivery(id: ID!): Delivery
  }

  type Mutation {
    createDelivery(
      originLat: Float!,
      originLng: Float!,
      destLat: Float!,
      destLng: Float!,
      customerId: ID!
    ): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverLocation(driverId: ID!, lat: Float!, lng: Float!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
  },
  Mutation: {
    createDelivery: async (_, { originLat, originLng, destLat, destLng, customerId }) => {
      const delivery = new Delivery({
        origin: { location: { lat: originLat, lng: originLng } },
        destination: { location: { lat: destLat, lng: destLng } },
        customer: customerId
      });
      return await delivery.save();
    },
    assignDriver: async (_, { deliveryId, driverId }, { pool }) => {
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('driver');

      // Log event to PostgreSQL
      if (pool) {
        try {
          await pool.query('INSERT INTO events (type, delivery_id) VALUES ($1, $2)', ['DRIVER_ASSIGNED', deliveryId]);
        } catch (e) {
          console.error('Failed to log event to PostgreSQL', e);
        }
      }

      return delivery;
    },
    updateDriverLocation: async (_, { driverId, lat, lng }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { currentLocation: { lat, lng } },
        { new: true }
      );

      // Cache location in Redis
      if (redisClient && redisClient.isOpen) {
        await redisClient.set(`driver:${driverId}:location`, JSON.stringify({ lat, lng }));
      }

      return driver;
    }
  },
};

const startServer = async () => {
  const { pool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({
      pool,
      redisClient
    })
  });

  console.log(`🚀  Server ready at ${url}`);
};

if (require.main === module) {
  startServer();
}

module.exports = { typeDefs, resolvers };
