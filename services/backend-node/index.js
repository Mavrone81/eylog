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
    lat: Float!
    lng: Float!
    address: String!
  }

  input LocationInput {
    lat: Float!
    lng: Float!
    address: String!
  }

  type Delivery {
    id: ID!
    status: String!
    origin: Location!
    destination: Location!
    driverId: ID
    customerId: ID
    updatedAt: String
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
    address: String!
  }

  type Route {
    optimized_route: [Location]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
    customer(id: ID!): Customer
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDeliveryStatus(id: ID!, status: String!): Delivery

    createDriver(name: String!, phone: String!, vehicleType: String): Driver
    updateDriverStatus(id: ID!, status: String!): Driver

    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer

    optimizeRoute(deliveryIds: [ID]!): Route
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    delivery: async (_, { id }) => await Delivery.findById(id),
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
    customer: async (_, { id }) => await Customer.findById(id),
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }, { pgPool }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId,
        status: 'PENDING',
        updatedAt: new Date()
      });
      await delivery.save();

      // Log event in PostgreSQL
      try {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination, customerId })]
        );
      } catch (err) {
        console.error('Failed to log event to PostgreSQL:', err);
      }

      // Optional: Call Python optimization service if needed
      // const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
      // await axios.post(`${pythonUrl}/optimize`, { locations: [origin, destination] });

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Update driver status in Redis cache
      try {
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');
      } catch (err) {
        console.error('Failed to update Redis:', err);
      }

      // Also update MongoDB
      driver.status = 'BUSY';
      await driver.save();

      return delivery;
    },
    updateDeliveryStatus: async (_, { id, status }) => {
      return await Delivery.findByIdAndUpdate(id, { status, updatedAt: new Date() }, { new: true });
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    updateDriverStatus: async (_, { id, status }) => {
      return await Driver.findByIdAndUpdate(id, { status }, { new: true });
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
    optimizeRoute: async (_, { deliveryIds }) => {
      const deliveries = await Delivery.find({ _id: { $in: deliveryIds } });
      const locations = deliveries.map(d => d.destination);

      const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
      try {
        const response = await axios.post(`${pythonUrl}/optimize`, { locations });
        return response.data;
      } catch (err) {
        console.error('Python service error:', err);
        throw new Error('Failed to optimize route');
      }
    }
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pgPool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({ pgPool, redisClient }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
