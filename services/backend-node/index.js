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
    vehicleType: String
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String
    origin: Location
    destination: Location
    createdAt: String
    updatedAt: String
  }

  type Route {
    optimizedLocations: [Location]
    distance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, phone: String!, vehicleType: String): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      const response = await axios.post(`${process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000'}/optimize`, {
        locations
      });
      return {
        optimizedLocations: response.data.optimized_route,
        distance: response.data.distance
      };
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();

      const { redisClient } = await getDB();
      await redisClient.set(`driver:${id}:status`, status);

      return driver;
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });
      await delivery.save();

      const { pool } = await getDB();
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
      );

      return await delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driver = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      driver.status = 'BUSY';
      await driver.save();

      const { redisClient } = await getDB();
      await redisClient.set(`driver:${driverId}:status`, 'BUSY');

      return await delivery.populate(['customer', 'driver']);
    }
  },
  Delivery: {
    customer: async (parent) => {
        if (parent.customer && parent.customer.name) return parent.customer;
        return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
        if (parent.driver && parent.driver.name) return parent.driver;
        return await Driver.findById(parent.driver);
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
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
