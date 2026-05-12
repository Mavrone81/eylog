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
  }

  type Route {
    locations: [Location]
    distance: Float
  }

  type Query {
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
    customer(id: ID!): Customer
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
    drivers: async () => {
      await getDB();
      return Driver.find();
    },
    driver: async (_, { id }) => {
      await getDB();
      return Driver.findById(id);
    },
    customers: async () => {
      await getDB();
      return Customer.find();
    },
    customer: async (_, { id }) => {
      await getDB();
      return Customer.findById(id);
    },
    deliveries: async () => {
      await getDB();
      return Delivery.find();
    },
    delivery: async (_, { id }) => {
      await getDB();
      return Delivery.findById(id);
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
          distance: response.data.distance,
        };
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createDriver: async (_, args) => {
      await getDB();
      return Driver.create(args);
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redis } = await getDB();
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      // Update Redis cache
      await redis.set(`driver:${id}:status`, status);

      return driver;
    },
    createCustomer: async (_, args) => {
      await getDB();
      return Customer.create(args);
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pg } = await getDB();
      const delivery = await Delivery.create({ customerId, origin, destination });

      // Log event to PostgreSQL
      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id.toString(), 'CREATED', JSON.stringify(delivery)]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis } = await getDB();
      await getDB();
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();

      // Update Redis cache
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      await getDB();
      return Customer.findById(parent.customerId);
    },
    driver: async (parent) => {
      if (!parent.driverId) return null;
      if (parent.driver && parent.driver.name) return parent.driver;
      await getDB();
      return Driver.findById(parent.driverId);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function startServer() {
  await getDB();
  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT) || 4000 },
  });
  console.log(`🚀  Server ready at ${url}`);
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers, server };
