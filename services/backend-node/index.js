const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const mongoose = require('mongoose');
const axios = require('axios');
const db = require('./db');
const Customer = require('./models/Customer');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
require('dotenv').config();

const typeDefs = `#graphql
  scalar DateTime

  type Location {
    lat: Float!
    lng: Float!
    address: String!
  }

  input LocationInput {
    lat: Float!
    lng: Float!
    address: String!
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    address: String!
    phone: String
  }

  type Driver {
    id: ID!
    name: String!
    vehicle_type: String!
    status: String!
    current_location: Location
  }

  type Delivery {
    id: ID!
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location!
    destination: Location!
    scheduled_at: DateTime
    completed_at: DateTime
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
    drivers(status: String): [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): OptimizedRoute
  }

  type Mutation {
    createCustomer(name: String!, email: String!, address: String!, phone: String): Customer
    createDriver(name: String!, vehicle_type: String!): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDeliveryStatus(id: ID!, status: String!): Delivery
  }
`;

const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver').exec(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver').exec(),
    drivers: async (_, { status }) => {
      const filter = status ? { status } : {};
      return await Driver.find(filter).exec();
    },
    customers: async () => await Customer.find().exec(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, { locations }, { timeout: 10000 });
        return response.data;
      } catch (error) {
        console.error('Optimization service error:', error.message);
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
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
      });
      const savedDelivery = await delivery.save();

      const { pool } = await db.getDB();
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [savedDelivery.id, 'DELIVERY_CREATED', JSON.stringify(savedDelivery)]
      );

      return await Delivery.findById(savedDelivery.id).populate('customer').exec();
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { pool, redisClient } = await db.getDB();
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

        // Update Redis after transaction
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');

        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    updateDeliveryStatus: async (_, { id, status }) => {
      const { pool, redisClient } = await db.getDB();
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const update = { status };
        if (status === 'DELIVERED') {
          update.completed_at = new Date();
        }

        const delivery = await Delivery.findByIdAndUpdate(id, update, { new: true, session })
          .populate('customer')
          .populate('driver');

        if (status === 'DELIVERED' && delivery.driver) {
          const driverId = delivery.driver.id;
          await Driver.findByIdAndUpdate(driverId, { status: 'AVAILABLE' }, { session });

          await pool.query(
            'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
            [id, 'DELIVERY_COMPLETED', JSON.stringify({ driverId })]
          );

          await session.commitTransaction();
          await redisClient.set(`driver:${driverId}:status`, 'AVAILABLE');
        } else {
          await pool.query(
            'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
            [id, 'STATUS_UPDATED', JSON.stringify({ status })]
          );
          await session.commitTransaction();
        }

        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  (async () => {
    await db.getDB(); // Ensure DB is initialized
    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    });
    console.log(`🚀  Server ready at ${url}`);
  })();
}

module.exports = { typeDefs, resolvers, server };
