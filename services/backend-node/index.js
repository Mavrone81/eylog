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
    lat: Float!
    lng: Float!
    address: String
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    driverId: ID
    customerId: ID
    updatedAt: String
  }

  type Driver {
    id: ID!
    name: String
    vehicleType: String
    currentLocation: Location
    status: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    address: String
  }

  type Route {
    optimized_route: [Location]
    message: String
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
  }

  type Mutation {
    createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Route
    createDriver(name: String!, vehicleType: String!, lat: Float!, lng: Float!): Driver
    createCustomer(name: String!, email: String!, address: String!): Customer
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('driverId customerId'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }) => {
      const delivery = new Delivery({
        origin,
        destination,
        customerId,
        status: 'PENDING',
        updatedAt: new Date()
      });
      return await delivery.save();
    },
    createDriver: async (_, { name, vehicleType, lat, lng }) => {
      const driver = new Driver({
        name,
        vehicleType,
        currentLocation: { lat, lng },
        status: 'AVAILABLE'
      });
      return await driver.save();
    },
    createCustomer: async (_, { name, email, address }) => {
      const customer = new Customer({
        name,
        email,
        address
      });
      return await customer.save();
    },
    assignDriver: async (_, { deliveryId, driverId }, context) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('Driver not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      delivery.updatedAt = new Date();
      await delivery.save();

      // Log event to PostgreSQL
      if (context.pgPool) {
        await context.pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );
      }

      // Cache status in Redis
      if (context.redisClient) {
        await context.redisClient.set(`delivery:${deliveryId}:status`, 'ASSIGNED');
      }

      // Call Python Route Optimization service
      try {
        const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
        const response = await axios.post(`${pythonServiceUrl}/optimize`, {
          locations: [
            { lat: driver.currentLocation.lat, lng: driver.currentLocation.lng },
            { lat: delivery.origin.lat, lng: delivery.origin.lng },
            { lat: delivery.destination.lat, lng: delivery.destination.lng }
          ]
        });
        return response.data;
      } catch (error) {
        console.error('Error calling optimization service:', error.message);
        return { message: 'Optimization service unavailable', optimized_route: [] };
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const initServer = async () => {
  const { pgPool, redisClient } = await connectDB();
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ pgPool, redisClient }),
  });
  console.log(`🚀  Server ready at ${url}`);
};

if (require.main === module) {
  initServer().catch(console.error);
}

module.exports = { typeDefs, resolvers, server, initServer };
