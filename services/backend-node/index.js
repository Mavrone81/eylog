const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const mongoose = require('mongoose');
const axios = require('axios');
const db = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
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
    phone: String
    status: String
    currentLocation: Location
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String
    origin: Location
    destination: Location
    estimatedDeliveryTime: DateTime
    actualDeliveryTime: DateTime
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
  }

  type Mutation {
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): [Location]
  }
`;

const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver').exec(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver').exec(),
    drivers: async () => await Driver.find().exec(),
    driver: async (_, { id }) => await Driver.findById(id).exec(),
    customers: async () => await Customer.find().exec(),
  },
  Mutation: {
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pool } = await db.getDB();
      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });
      await delivery.save();

      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'DELIVERY_CREATED', JSON.stringify(delivery)]
      );

      return await Delivery.findById(delivery.id).populate('customer').exec();
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

        driver.status = 'BUSY';
        await driver.save({ session });

        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { driver: driverId, status: 'ASSIGNED' },
          { new: true, session }
        ).populate('customer').populate('driver').exec();

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
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize', {
          locations
        }, { timeout: 10000 });
        return response.data.optimized_route;
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
