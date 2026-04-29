require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { connectDB, getDB } = require('./db');
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
    address: Location
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String!
    origin: Location
    destination: Location
    estimatedDeliveryTime: String
    actualDeliveryTime: String
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
    createCustomer(name: String!, email: String!, phone: String!, address: LocationInput!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customerId').populate('driverId'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customerId').populate('driverId'),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(`${process.env.PYTHON_SERVICE_URL || 'http://localhost:5000'}/optimize`, { locations });
        return {
          optimizedLocations: response.data.optimized_route,
          distance: response.data.distance
        };
      } catch (error) {
        console.error('Error calling optimization service:', error);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Delivery: {
    customer: (parent) => parent.customerId,
    driver: (parent) => parent.driverId
  },
  Mutation: {
    createDriver: async (_, args) => {
      return await Driver.create(args);
    },
    createCustomer: async (_, args) => {
      return await Customer.create(args);
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
      const delivery = await Delivery.create({ customerId, origin, destination, status: 'PENDING' });

      // Log event to PostgreSQL
      const { pg } = getDB();
      if (pg) {
        await pg.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination })]
        );
      }

      return await delivery.populate('customerId');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const delivery = await Delivery.findByIdAndUpdate(
        deliveryId,
        { driverId, status: 'ASSIGNED' },
        { new: true }
      ).populate('customerId').populate('driverId');

      // Update driver status to BUSY
      await Driver.findByIdAndUpdate(driverId, { status: 'BUSY' });

      // Update Redis cache for driver status
      const { redis } = getDB();
      if (redis) {
        await redis.set(`driver:${driverId}:status`, 'BUSY');
      }

      // Log event
      const { pg } = getDB();
      if (pg) {
        await pg.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [deliveryId, 'ASSIGNED', JSON.stringify({ driverId })]
        );
      }

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (!driver) throw new Error('Driver not found');

      const { redis } = getDB();
      if (redis) {
        await redis.set(`driver:${id}:status`, status);
      }
      return driver;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
