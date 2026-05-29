const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const axios = require('axios');
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
    phone: String
    status: String
    location: Location
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

  type OptimizationResult {
    optimizedRoute: [Location]
    distance: Float
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
    createDriver(name: String!, email: String!, phone: String): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
    optimizeRoute(locations: [LocationInput]!): OptimizationResult
  }
`;

const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (parent.driver && parent.driver.name) return parent.driver;
      if (!parent.driver) return null;
      return await Driver.findById(parent.driver);
    }
  },
  Mutation: {
    createCustomer: async (_, args) => {
      return await Customer.create(args);
    },
    createDriver: async (_, args) => {
      return await Driver.create(args);
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pool } = await db.getDB();
      const delivery = await Delivery.create({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });

      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'DELIVERY_CREATED', JSON.stringify(delivery)]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { pool, redis, mongoose } = await db.getDB();
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const driver = await Driver.findByIdAndUpdate(
          driverId,
          { status: 'BUSY' },
          { new: true, session }
        );

        if (!driver) throw new Error('Driver not found');

        await redis.set(`driver:${driverId}:status`, 'BUSY');

        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { driver: driverId, status: 'ASSIGNED' },
          { new: true, session }
        ).populate('customer').populate('driver');

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
    updateDriverStatus: async (_, { driverId, status }) => {
      const { redis } = await db.getDB();
      const driver = await Driver.findByIdAndUpdate(driverId, { status }, { new: true });
      if (driver) {
        await redis.set(`driver:${driverId}:status`, status);
      }
      return driver;
    },
    optimizeRoute: async (_, { locations }) => {
      const url = process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize';
      try {
        const response = await axios.post(url, { locations }, { timeout: 10000 });
        return {
          optimizedRoute: response.data.optimized_route,
          distance: response.data.distance,
          status: response.data.status,
          message: response.data.message
        };
      } catch (error) {
        console.error('Optimization service error:', error.message);
        return {
          status: 'error',
          message: 'Failed to connect to optimization service'
        };
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
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
