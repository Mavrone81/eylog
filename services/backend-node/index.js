require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { getDB } = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
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

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    customer: Customer
    driver: Driver
    createdAt: String
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    phone: String
    status: String
    vehicleType: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    address: String
  }

  type Route {
    optimizedLocations: [Location]
    totalDistance: Float
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`, {
          locations
        });
        return {
          optimizedLocations: response.data.optimized_route,
          totalDistance: response.data.total_distance,
          message: response.data.message
        };
      } catch (error) {
        console.error('Optimization service error:', error);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({ customerId, origin, destination, status: 'PENDING' });
      await delivery.save();

      const { pg } = await getDB();
      await pg.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
      );

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driverId, status: 'ASSIGNED' },
        { new: true }
      );

      const driver = await Driver.findByIdAndUpdate(
        driverId,
        { status: 'BUSY' },
        { new: true }
      );

      const { redis } = await getDB();
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      const { redis } = await getDB();
      await redis.set(`driver:${id}:status`, status);

      return driver;
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    }
  },
  Delivery: {
    customer: async (parent) => {
        if (parent.customer && parent.customer.name) return parent.customer;
        return await Customer.findById(parent.customerId);
    },
    driver: async (parent) => {
        if (parent.driver && parent.driver.name) return parent.driver;
        return await Driver.findById(parent.driverId);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
