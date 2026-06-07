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

  type Location {
    lat: Float
    lng: Float
    address: String
  }

  input LocationInput {
    lat: Float
    lng: Float
    address: String
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Driver {
    id: ID!
    name: String!
    status: String!
    location: Location
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Delivery {
    id: ID!
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location!
    destination: Location!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type OptimizedRoute {
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
    createCustomer(name: String!, email: String!): Customer
    createDriver(name: String!): Driver
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): OptimizedRoute
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
    createCustomer: async (_, { name, email }) => {
      const customer = new Customer({ name, email });
      return await customer.save();
    },
    createDriver: async (_, { name }) => {
      const driver = new Driver({ name, status: 'AVAILABLE' });
      return await driver.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({ customer: customerId, origin, destination, status: 'PENDING' });
      const savedDelivery = await delivery.save();

      const { pool } = await db.getDB();
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [savedDelivery.id, 'DELIVERY_CREATED', JSON.stringify(savedDelivery)]
      );

      return await savedDelivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { pool, redisClient, mongoose } = await db.getDB();
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

        await redisClient.set(`driver:${driverId}:status`, 'BUSY');

        await pool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );

        await session.commitTransaction();
        return await delivery.populate(['customer', 'driver']);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, { locations }, { timeout: 10000 });
        return response.data;
      } catch (error) {
        console.error('Optimization error:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (!parent.driver) return null;
      if (parent.driver.name) return parent.driver;
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
