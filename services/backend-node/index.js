const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const axios = require('axios');
const mongoose = require('mongoose');
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
    items: [String]
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
  }

  type Mutation {
    createDelivery(
      customerId: ID!
      origin: LocationInput!
      destination: LocationInput!
      items: [String]
    ): Delivery

    assignDriver(deliveryId: ID!, driverId: ID!): Delivery

    optimizeRoute(locations: [LocationInput]!): [Location]
  }
`;

const resolvers = {
  DateTime: DateTimeResolver,
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (parent.driver && parent.driver.name) return parent.driver;
      return Driver.findById(parent.driver);
    },
  },
  Query: {
    deliveries: async () => Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => Delivery.findById(id).populate('customer').populate('driver'),
  },
  Mutation: {
    createDelivery: async (_, { customerId, origin, destination, items }) => {
      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
        items,
        status: 'PENDING',
      });
      await delivery.save();

      const { pg } = await db.getDB();
      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'DELIVERY_CREATED', JSON.stringify(delivery)]
      );

      return delivery;
    },

    assignDriver: async (_, { deliveryId, driverId }) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const driver = await Driver.findById(driverId).session(session);
        if (!driver || driver.status !== 'AVAILABLE') {
          throw new Error('Driver not available');
        }

        const delivery = await Delivery.findById(deliveryId).session(session);
        if (!delivery) {
          throw new Error('Delivery not found');
        }

        driver.status = 'BUSY';
        await driver.save({ session });

        delivery.driver = driverId;
        delivery.status = 'ASSIGNED';
        await delivery.save({ session });

        const { pg, redis } = await db.getDB();
        await redis.set(`driver:${driverId}:status`, 'BUSY');

        await pg.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );

        await session.commitTransaction();
        return delivery.populate('customer driver');
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
        return response.data.optimized_route;
      } catch (error) {
        console.error('Optimization error:', error.message);
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
