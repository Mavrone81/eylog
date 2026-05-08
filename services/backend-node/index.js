require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { getDB } = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

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
    status: String!
    origin: Location!
    destination: Location!
    customer: Customer
    driver: Driver
  }

  type Route {
    locations: [Location]
    totalDistance: Float
  }

  type Query {
    drivers: [Driver]
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
    drivers: async () => {
      await getDB();
      return Driver.find();
    },
    customers: async () => {
      await getDB();
      return Customer.find();
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
      const url = process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize';
      try {
        const response = await axios.post(url, { locations });
        return {
          locations: response.data.optimized_route,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Optimization service error:', error);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
      await getDB();
      return Driver.create(args);
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redis } = await getDB();
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver) {
        await redis.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    createCustomer: async (_, args) => {
      await getDB();
      return Customer.create(args);
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pg } = await getDB();
      const delivery = await Delivery.create({ customerId, origin, destination });

      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id.toString(), 'CREATED', JSON.stringify(delivery)]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis } = await getDB();
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driverId, status: 'ASSIGNED' },
        { new: true }
      );
      if (delivery) {
        await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });
        await redis.set(`driver:${driverId}:status`, 'BUSY');
      }
      return delivery;
    }
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return Customer.findById(parent.customerId);
    },
    driver: async (parent) => {
      if (!parent.driverId) return null;
      if (parent.driver && parent.driver.name) return parent.driver;
      return Driver.findById(parent.driverId);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  startStandaloneServer(server, {
    listen: { port: 4000 },
  }).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { typeDefs, resolvers, server };
