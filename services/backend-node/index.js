const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const axios = require('axios');
const db = require('./db');
const Customer = require('./models/Customer');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

const typeDefs = `#graphql
  scalar DateTime

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String
    address: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Driver {
    id: ID!
    name: String!
    email: String!
    status: String!
    location: Location
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Location {
    lat: Float
    lng: Float
    address: String
  }

  input LocationInput {
    lat: Float!
    lng: Float!
    address: String
  }

  type Delivery {
    id: ID!
    customer: Customer!
    driver: Driver
    status: String!
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
    customers: [Customer]
  }

  type Mutation {
    createCustomer(name: String!, email: String!, phone: String, address: String): Customer
    createDriver(name: String!, email: String!): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
    optimizeRoute(locations: [LocationInput]!): [Location]
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
  Mutation: {
    createCustomer: async (_, args) => await Customer.create(args),
    createDriver: async (_, args) => await Driver.create(args),
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = await Delivery.create({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING',
      });

      const { pg } = await db.getDB();
      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'DELIVERY_CREATED', JSON.stringify(delivery)]
      );

      return delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { mongoose, redis, pg } = await db.getDB();
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

        await redis.set(`driver:${driverId}:status`, 'BUSY');

        await pg.query(
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
      try {
        const response = await axios.post(
          process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize',
          { locations },
          { timeout: 10000 }
        );
        return response.data.optimized_route;
      } catch (error) {
        console.error('Optimization error:', error);
        throw new Error('Failed to optimize route');
      }
    },
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
      listen: { port: process.env.PORT || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
