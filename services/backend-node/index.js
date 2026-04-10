require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { connectDB } = require('./db');
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
    lat: Float
    lng: Float
    address: String
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    driverId: ID
    customerId: ID
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
    optimized_route: [Location]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
    delivery(id: ID!): Delivery
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    createDriver(name: String!, vehicleType: String!): Driver
    updateDriverStatus(id: ID!, status: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.PYTHON_SERVICE_URL || 'http://localhost:5000/optimize', { locations });
        return response.data;
      } catch (error) {
        console.error('Error optimizing route:', error);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }, { pgPool }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      await delivery.save();

      // Log to PostgreSQL
      await pgPool.query('INSERT INTO delivery_events (delivery_id, event_type) VALUES ($1, $2)', [delivery.id, 'CREATED']);

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      // Cache status in Redis
      await redisClient.set(`delivery:${deliveryId}:status`, 'ASSIGNED');

      return delivery;
    },
    createDriver: async (_, { name, vehicleType }) => {
      const driver = new Driver({ name, vehicleType });
      await driver.save();
      return driver;
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      await redisClient.set(`driver:${id}:status`, status);
      return driver;
    },
    createCustomer: async (_, { name, email, phone, address }) => {
      const customer = new Customer({ name, email, phone, address });
      await customer.save();
      return customer;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pgPool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({ pgPool, redisClient })
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  }).catch(err => {
    console.error('Failed to connect to databases', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers, server };
