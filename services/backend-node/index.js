const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const connectDB = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const axios = require('axios');

const typeDefs = `#graphql
  type Location {
    lat: Float
    lng: Float
    address: String
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
  }

  type Driver {
    id: ID!
    name: String!
    vehicle: String
    status: String
    currentLocation: Location
    rating: Float
    deliveriesCompleted: Int
  }

  type Delivery {
    id: ID!
    status: String
    origin: Location
    destination: Location
    customer: Customer
    driver: Driver
    estimatedDeliveryTime: String
    actualDeliveryTime: String
    createdAt: String
  }

  type RouteResponse {
    optimized_route: [Int]
    status: String
    message: String
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    customers: [Customer]
    getOptimizedRoute(locations: [[Float]]!): RouteResponse
  }

  type Mutation {
    createDelivery(
      originAddress: String!
      originLat: Float!
      originLng: Float!
      destinationAddress: String!
      destinationLat: Float!
      destinationLng: Float!
      customerId: ID!
    ): Delivery

    assignDriver(deliveryId: ID!, driverId: ID!): Delivery

    updateDeliveryStatus(deliveryId: ID!, status: String!): Delivery

    createDriver(name: String!, vehicle: String): Driver

    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    getOptimizedRoute: async (_, { locations }) => {
      try {
        const response = await axios.post('http://localhost:5000/optimize', { locations });
        return response.data;
      } catch (error) {
        console.error('Error fetching optimized route:', error.message);
        throw new Error('Failed to fetch optimized route');
      }
    }
  },
  Mutation: {
    createDelivery: async (_, { originAddress, originLat, originLng, destinationAddress, destinationLat, destinationLng, customerId }) => {
      const delivery = new Delivery({
        origin: { address: originAddress, coordinates: { lat: originLat, lng: originLng } },
        destination: { address: destinationAddress, coordinates: { lat: destinationLat, lng: destinationLng } },
        customer: customerId
      });
      await delivery.save();
      // Log event in PostgreSQL
      // Use pgPool from context if we were using it in a real app
      return await delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }, { pgPool }) => {
      const delivery = await Delivery.findByIdAndUpdate(deliveryId, { driver: driverId, status: 'ASSIGNED' }, { new: true }).populate('customer').populate('driver');
      if (pgPool) {
        await pgPool.query('INSERT INTO delivery_events (delivery_id, event_type, driver_id) VALUES ($1, $2, $3)', [deliveryId, 'DRIVER_ASSIGNED', driverId]);
      }
      return delivery;
    },
    updateDeliveryStatus: async (_, { deliveryId, status }, { pgPool, redisClient }) => {
      const delivery = await Delivery.findByIdAndUpdate(deliveryId, { status }, { new: true }).populate('customer').populate('driver');

      // Update Redis cache for real-time tracking
      if (redisClient) {
        await redisClient.set(`delivery_status:${deliveryId}`, status);
      }

      // Log in PostgreSQL
      if (pgPool) {
        await pgPool.query('INSERT INTO delivery_events (delivery_id, event_type) VALUES ($1, $2)', [deliveryId, `STATUS_UPDATED_${status}`]);
      }

      return delivery;
    },
    createDriver: async (_, { name, vehicle }) => {
      const driver = new Driver({ name, vehicle });
      return await driver.save();
    },
    createCustomer: async (_, { name, email, phone, address }) => {
      const customer = new Customer({ name, email, phone, address });
      return await customer.save();
    }
  }
};

const startServer = async () => {
  const { pgPool, redisClient } = await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  if (require.main === module) {
    const { url } = await startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({
        pgPool,
        redisClient
      }),
    });
    console.log(`🚀  Server ready at ${url}`);
  }
};

startServer();

module.exports = { typeDefs, resolvers };
