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

  type Driver {
    id: ID!
    name: String!
    email: String!
    status: String!
    location: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String
    address: String
  }

  type Location {
    lat: Float
    lng: Float
    address: String
  }

  type Delivery {
    id: ID!
    status: String!
    origin: Location
    destination: Location
    customer: Customer
    driver: Driver
    estimatedDeliveryTime: DateTime
    actualDeliveryTime: DateTime
    route: [Location]
  }

  input LocationInput {
    lat: Float
    lng: Float
    address: String
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
    optimizeRoute(deliveryId: ID!, locations: [LocationInput]!): Delivery
  }
`;

const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    deliveries: async () => await Delivery.find().populate('customer driver').exec(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer driver').exec(),
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
        status: 'PENDING',
      });
      const savedDelivery = await delivery.save();

      const { pool } = await db.getDB();
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [savedDelivery.id, 'DELIVERY_CREATED', JSON.stringify(savedDelivery)]
      );

      return await savedDelivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { mongoose: mongoConn, redis } = await db.getDB();
      const session = await mongoConn.startSession();
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
        );

        driver.status = 'BUSY';
        driver.currentDelivery = deliveryId;
        await driver.save({ session });

        await redis.set(`driver:${driverId}:status`, 'BUSY');

        const { pool } = await db.getDB();
        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );

        await session.commitTransaction();
        return await delivery.populate('customer driver');
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    optimizeRoute: async (_, { deliveryId, locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, {
          locations,
        }, { timeout: 10000 });

        const optimizedRoute = response.data.optimized_route;

        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { route: optimizedRoute },
          { new: true }
        ).populate('customer driver').exec();

        return delivery;
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
