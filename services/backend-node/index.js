const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const cors = require('cors');
require('dotenv').config();

const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
});

// Redis Connection
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const typeDefs = `#graphql
  type Location {
    address: String
    lat: Float
    lng: Float
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    customer: Customer
    driver: Driver
    estimatedDeliveryTime: String
  }

  type Driver {
    id: ID!
    name: String
    status: String
    currentLocation: Location
    vehicleType: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    address: String
  }

  type Route {
    stops: [Location]
    distance: Float
    duration: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(
      originAddress: String!,
      originLat: Float!,
      originLng: Float!,
      destAddress: String!,
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
    deliveries: async () => {
      // Try to get from Redis cache first
      const cached = await redisClient.get('deliveries');
      if (cached) return JSON.parse(cached);

      const deliveries = await Delivery.find().populate('customer driver');
      await redisClient.set('deliveries', JSON.stringify(deliveries), { EX: 60 });
      return deliveries;
    },
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer driver'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
  },
  Mutation: {
    createDelivery: async (_, { originAddress, originLat, originLng, destAddress, destLat, destLng, customerId }) => {
      const delivery = new Delivery({
        origin: { address: originAddress, lat: originLat, lng: originLng },
        destination: { address: destAddress, lat: destLat, lng: destLng },
        customer: customerId,
        status: 'PENDING'
      });
      const saved = await delivery.save();

      // Log to PostgreSQL
      await pool.query('INSERT INTO delivery_logs (delivery_id, action, timestamp) VALUES ($1, $2, NOW())', [saved.id, 'CREATED']);

      // Invalidate Redis cache
      await redisClient.del('deliveries');

      return saved;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const updated = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer driver');

      // Log to PostgreSQL
      await pool.query('INSERT INTO delivery_logs (delivery_id, action, timestamp) VALUES ($1, $2, NOW())', [deliveryId, 'ASSIGNED']);

      // Invalidate Redis cache
      await redisClient.del('deliveries');

      return updated;
    },
    updateDriverLocation: async (_, { driverId, lat, lng }) => {
      return await Driver.findByIdAndUpdate(
        driverId,
        { currentLocation: { lat, lng } },
        { new: true }
      );
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
  mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

  redisClient.connect()
    .then(() => console.log('Connected to Redis'))
    .catch(err => console.error('Could not connect to Redis', err));

  startStandaloneServer(server, {
    listen: { port: 4000 },
  }).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { typeDefs, resolvers, server };
