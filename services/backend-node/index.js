const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const axios = require('axios');
const mongoose = require('mongoose');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
require('dotenv').config();

const typeDefs = `#graphql
  scalar DateTime

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

  type Driver {
    id: ID!
    name: String!
    email: String!
    status: String!
    current_location: Location
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    address: Location
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String!
    origin: Location
    destination: Location
    items: [String]
    total_price: Float
    createdAt: DateTime
    updatedAt: DateTime
  }

  type OptimizedRoute {
    optimized_route: [Location]
    total_distance_km: Float
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createCustomer(name: String!, email: String!, address: LocationInput!): Customer
    createDriver(name: String!, email: String!, current_location: LocationInput): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!, items: [String], total_price: Float): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDeliveryStatus(deliveryId: ID!, status: String!): Delivery
    optimizeRoute(locations: [LocationInput]!): OptimizedRoute
  }
`;

const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver').exec(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver').exec(),
    drivers: async () => await Driver.find().exec(),
    customers: async () => await Customer.find().exec(),
  },
  Mutation: {
    createCustomer: async (_, { name, email, address }) => {
      const customer = new Customer({ name, email, address });
      return await customer.save();
    },
    createDriver: async (_, { name, email, current_location }) => {
      const driver = new Driver({ name, email, current_location });
      return await driver.save();
    },
    createDelivery: async (_, { customerId, origin, destination, items, total_price }) => {
      const { pool } = await db.getDB();
      const delivery = new Delivery({ customer: customerId, origin, destination, items, total_price });
      const savedDelivery = await delivery.save();

      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [savedDelivery.id, 'DELIVERY_CREATED', JSON.stringify(savedDelivery)]
      );

      return await savedDelivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis, pool } = await db.getDB();
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const driver = await Driver.findById(driverId).session(session);
        if (!driver || driver.status !== 'AVAILABLE') {
          throw new Error('Driver not available');
        }

        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { driver: driverId, status: 'ASSIGNED' },
          { new: true, session }
        ).populate('customer').populate('driver');

        driver.status = 'BUSY';
        await driver.save({ session });

        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );

        await session.commitTransaction();
        await redis.set(`driver:${driverId}:status`, 'BUSY');

        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    updateDeliveryStatus: async (_, { deliveryId, status }) => {
      const { pool, redis } = await db.getDB();
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { status },
          { new: true, session }
        ).populate('customer').populate('driver');

        if (status === 'DELIVERED' && delivery.driver) {
          const driver = await Driver.findById(delivery.driver.id).session(session);
          driver.status = 'AVAILABLE';
          await driver.save({ session });
          await redis.set(`driver:${driver.id.toString()}:status`, 'AVAILABLE');
        }

        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'STATUS_UPDATED', JSON.stringify({ status })]
        );

        await session.commitTransaction();
        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    optimizeRoute: async (_, { locations }) => {
      const url = process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize';
      try {
        const response = await axios.post(url, { locations }, { timeout: 10000 });
        return response.data;
      } catch (error) {
        throw new Error('Optimization service failed: ' + error.message);
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
