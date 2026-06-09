const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const axios = require('axios');
const mongoose = require('mongoose');
const db = require('./db');
const Customer = require('./models/Customer');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
require('dotenv').config();

const typeDefs = `#graphql
  scalar DateTime

  type Location {
    address: String
    lat: Float
    lng: Float
  }

  input LocationInput {
    address: String
    lat: Float
    lng: Float
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    address: String
    phone: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Driver {
    id: ID!
    name: String!
    vehicleType: String
    status: String
    currentLocation: Location
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    origin: Location
    destination: Location
    status: String
    estimatedDeliveryTime: DateTime
    actualDeliveryTime: DateTime
    createdAt: DateTime
    updatedAt: DateTime
  }

  type OptimizationResult {
    optimized_route: [Location]
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
    createCustomer(name: String!, email: String!, address: String, phone: String): Customer
    createDriver(name: String!, vehicleType: String): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): OptimizationResult
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
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pool } = await db.getDB();
      const delivery = new Delivery({ customer: customerId, origin, destination });
      const savedDelivery = await delivery.save();

      // Log event to PostgreSQL
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [savedDelivery.id, 'DELIVERY_CREATED', JSON.stringify(savedDelivery)]
      );

      return await Delivery.findById(savedDelivery.id).populate('customer').exec();
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { pool, redisClient, mongoose: conn } = await db.getDB();
      const session = await conn.startSession();
      session.startTransaction();

      try {
        const driver = await Driver.findById(driverId).session(session).exec();
        if (!driver || driver.status !== 'AVAILABLE') {
          throw new Error('Driver is not available');
        }

        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { driver: driverId, status: 'ASSIGNED' },
          { new: true, session }
        ).populate('customer').populate('driver').exec();

        // Update driver status in MongoDB
        driver.status = 'BUSY';
        await driver.save({ session });

        // Update driver status in Redis
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');

        // Log event to PostgreSQL
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
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
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, {
          locations,
        }, { timeout: 10000 });
        return response.data;
      } catch (error) {
        console.error('Optimization service error:', error);
        throw new Error('Failed to optimize route');
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: parseInt(process.env.PORT) || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
