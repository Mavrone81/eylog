require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { getDB } = require('./db');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const Delivery = require('./models/Delivery');

const typeDefs = `#graphql
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

  type Driver {
    id: ID!
    name: String!
    phone: String!
    status: String!
    vehicleType: String!
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
  }

  type Delivery {
    id: ID!
    customer: Customer!
    driver: Driver
    status: String!
    origin: Location!
    destination: Location!
    createdAt: String
    updatedAt: String
  }

  type Route {
    optimized_route: [Location]
    distance: Float
    message: String
  }

  type Query {
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, { locations }, { timeout: 10000 });
        return response.data;
      } catch (err) {
        console.error('Optimization service error:', err.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createDriver: async (_, args) => await Driver.create(args),
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      const { redis } = await getDB();
      await redis.set(`driver:${id}:status`, status);

      return driver;
    },
    createCustomer: async (_, args) => await Customer.create(args),
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = await Delivery.create({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });

      const { pg } = await getDB();
      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify(delivery)]
      );

      return await delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driver: driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customer').populate('driver');

      driver.status = 'BUSY';
      await driver.save();

      const { redis } = await getDB();
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
  },
  Delivery: {
    customer: (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return Customer.findById(parent.customer);
    },
    driver: (parent) => {
      if (!parent.driver) return null;
      if (parent.driver && parent.driver.name) return parent.driver;
      return Driver.findById(parent.driver);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  // Ensure DB connection before starting server
  getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: parseInt(process.env.PORT) || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  }).catch(err => {
    console.error('Failed to connect to databases:', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers, server };
