const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { resolvers: scalarResolvers, typeDefs: scalarTypeDefs } = require('graphql-scalars');
const axios = require('axios');
const db = require('./db');
const Customer = require('./models/Customer');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

const typeDefs = `#graphql
  ${scalarTypeDefs.join('\n')}

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
    address: String!
    phone: String
  }

  type Driver {
    id: ID!
    name: String!
    email: String!
    status: String!
    vehicleType: String
    currentLocation: Location
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
    createCustomer(name: String!, email: String!, address: String!, phone: String): Customer
    createDriver(name: String!, email: String!, vehicleType: String): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
    optimizeRoute(locations: [LocationInput]!): [Location]
  }
`;

const resolvers = {
  ...scalarResolvers,
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
    },
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
        status: 'PENDING',
      });

      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'DELIVERY_CREATED', JSON.stringify(delivery)]
      );

      return delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis, mongoose, pool } = await db.getDB();
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const driver = await Driver.findById(driverId).session(session);
        if (!driver) throw new Error('Driver not found');
        if (driver.status === 'BUSY') throw new Error('Driver is already busy');

        driver.status = 'BUSY';
        await driver.save({ session });

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
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      await redis.set(`driver:${driverId}:status`, status);
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
        console.error('Optimization service error:', error.message);
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
      listen: { port: process.env.PORT || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
