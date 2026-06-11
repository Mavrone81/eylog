const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const axios = require('axios');
const mongoose = require('mongoose');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

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
    phone: String
    address: String
  }

  type Driver {
    id: ID!
    name: String!
    email: String!
    vehicleType: String!
    status: String!
    currentLocation: Location
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String!
    origin: Location
    destination: Location
    estimatedDeliveryTime: DateTime
    actualDeliveryTime: DateTime
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
    createCustomer(name: String!, email: String!, phone: String, address: String): Customer
    createDriver(name: String!, email: String!, vehicleType: String!): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
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
        status: 'PENDING'
      });
      return await delivery.save();
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { pool, redis } = await db.getDB();
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const driver = await Driver.findById(driverId).session(session).exec();
        if (!driver || driver.status !== 'AVAILABLE') {
          throw new Error('Driver not available');
        }

        const delivery = await Delivery.findById(deliveryId).session(session).exec();
        if (!delivery) {
          throw new Error('Delivery not found');
        }

        driver.status = 'BUSY';
        await driver.save({ session });

        delivery.driver = driverId;
        delivery.status = 'ASSIGNED';
        await delivery.save({ session });

        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );

        await session.commitTransaction();

        await redis.set(`driver:${driverId}:status`, 'BUSY');

        return await Delivery.findById(deliveryId).populate('customer').populate('driver').exec();
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
        const delivery = await Delivery.findById(deliveryId).session(session).exec();
        if (!delivery) {
          throw new Error('Delivery not found');
        }

        delivery.status = status;
        if (status === 'DELIVERED') {
          delivery.actualDeliveryTime = new Date();
        }
        await delivery.save({ session });

        if (status === 'DELIVERED' && delivery.driver) {
          const driverId = delivery.driver.toString();
          await Driver.findByIdAndUpdate(driverId, { status: 'AVAILABLE' }).session(session);
          await session.commitTransaction();
          await redis.set(`driver:${driverId}:status`, 'AVAILABLE');
        } else {
          await session.commitTransaction();
        }

        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'STATUS_UPDATED', JSON.stringify({ status })]
        );

        return await Delivery.findById(deliveryId).populate('customer').populate('driver').exec();
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
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
