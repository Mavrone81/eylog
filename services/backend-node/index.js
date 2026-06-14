const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { GraphQLScalarType, Kind } = require('graphql');
const axios = require('axios');
const mongoose = require('mongoose');
const db = require('./db');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const Delivery = require('./models/Delivery');

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

  type Driver {
    id: ID!
    name: String!
    email: String!
    status: String!
    vehicle_type: String
    current_location: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    address: Location!
  }

  type Delivery {
    id: ID!
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location
    destination: Location
    estimated_delivery_time: DateTime
    actual_delivery_time: DateTime
    createdAt: DateTime
    updatedAt: DateTime
  }

  type OptimizedRoute {
    locations: [Location]
    total_distance_km: Float
  }

  type Query {
    drivers: [Driver]
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
  }

  type Mutation {
    createCustomer(name: String!, email: String!, address: LocationInput!): Customer
    createDriver(name: String!, email: String!, vehicle_type: String!): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDeliveryStatus(deliveryId: ID!, status: String!): Delivery
    optimizeRoute(locations: [LocationInput]!): OptimizedRoute
  }
`;

const resolvers = {
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value) {
      return value instanceof Date ? value.toISOString() : null;
    },
    parseValue(value) {
      return new Date(value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value);
      }
      return null;
    },
  }),
  Query: {
    drivers: async () => await Driver.find().exec(),
    deliveries: async () => await Delivery.find().populate('customer').populate('driver').exec(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver').exec(),
  },
  Mutation: {
    createCustomer: async (_, { name, email, address }) => {
      const customer = new Customer({ name, email, address });
      return await customer.save();
    },
    createDriver: async (_, { name, email, vehicle_type }) => {
      const driver = new Driver({ name, email, vehicle_type });
      return await driver.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({ customer: customerId, origin, destination });
      const savedDelivery = await delivery.save();

      const { pool } = db.getDB();
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [savedDelivery.id.toString(), 'DELIVERY_CREATED', JSON.stringify(savedDelivery)]
      );

      return await savedDelivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
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
        ).populate('customer').populate('driver').exec();

        driver.status = 'BUSY';
        await driver.save({ session });

        await session.commitTransaction();

        const { redisClient, pool } = db.getDB();
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );

        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    updateDeliveryStatus: async (_, { deliveryId, status }) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { status },
          { new: true, session }
        ).populate('customer').populate('driver').exec();

        if (status === 'DELIVERED' && delivery.driver) {
          const driver = await Driver.findById(delivery.driver._id).session(session);
          driver.status = 'AVAILABLE';
          await driver.save({ session });

          const { redisClient } = db.getDB();
          await redisClient.set(`driver:${delivery.driver._id}:status`, 'AVAILABLE');
        }

        const { pool } = db.getDB();
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
      try {
        const response = await axios.post(
          process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations },
          { timeout: 10000 }
        );
        return {
            locations: response.data.optimized_route,
            total_distance_km: response.data.total_distance_km
        };
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.initDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
