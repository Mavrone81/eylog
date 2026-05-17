require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const db = require('./db');
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
    lat: Float
    lng: Float
    address: String
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

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String
    origin: Location
    destination: Location
    estimatedDeliveryTime: String
    actualDeliveryTime: String
  }

  type Route {
    locations: [Location]
    totalDistance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDelivery(
      customerId: ID!
      origin: LocationInput!
      destination: LocationInput!
    ): Delivery

    assignDriver(deliveryId: ID!, driverId: ID!): Delivery

    updateDriverStatus(id: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => {
      return await Delivery.find().populate('customerId driverId');
    },
    delivery: async (_, { id }) => {
      return await Delivery.findById(id).populate('customerId driverId');
    },
    drivers: async () => {
      return await Driver.find();
    },
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL, {
          locations
        }, { timeout: 10000 });
        return {
          locations: response.data.optimized_route,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Error optimizing route:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDelivery: async (_, { customerId, origin, destination }) => {
      const { pool } = await db.getDB();
      const delivery = new Delivery({
        customerId,
        origin,
        destination,
        status: 'PENDING'
      });
      await delivery.save();

      // Log event to PostgreSQL
      await pool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
      );

      return delivery.populate('customerId');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis } = await db.getDB();
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customerId driverId');

      // Update driver status in MongoDB and Redis
      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });
      await redis.set(`driver:${driverId}:status`, 'BUSY');

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redis } = await db.getDB();
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver) {
        await redis.set(`driver:${id}:status`, status);
      }
      return driver;
    }
  },
  Delivery: {
    customer: (parent) => parent.customerId.name ? parent.customerId : Customer.findById(parent.customerId),
    driver: (parent) => {
      if (!parent.driverId) return null;
      return parent.driverId.name ? parent.driverId : Driver.findById(parent.driverId);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  (async () => {
    await db.getDB();
    const { url } = await startStandaloneServer(server, {
      listen: { port: parseInt(process.env.PORT) || 4000 },
    });
    console.log(`🚀  Server ready at ${url}`);
  })();
}

module.exports = { typeDefs, resolvers, server };
