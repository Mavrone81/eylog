const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

const typeDefs = `#graphql
  scalar DateTime

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
    email: String
    status: String
    vehicleInfo: VehicleInfo
    currentLocation: Location
    createdAt: DateTime
    updatedAt: DateTime
  }

  type VehicleInfo {
    make: String
    model: String
    licensePlate: String
  }

  type Customer {
    id: ID!
    name: String
    email: String
    phone: String
    address: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String
    origin: Location
    destination: Location
    payload: String
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Route {
    optimizedLocations: [Location]
    totalDistance: Float
  }

  type Query {
    deliveries: [Delivery]
    delivery(id: ID!): Delivery
    drivers: [Driver]
    driver(id: ID!): Driver
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, email: String!, vehicleInfo: VehicleInfoInput): Driver
    createCustomer(name: String!, email: String!, phone: String, address: String): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!, payload: String): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(id: ID!, status: String!): Driver
  }

  input VehicleInfoInput {
    make: String
    model: String
    licensePlate: String
  }
`;

async function logEvent(pool, deliveryId, eventType, payload) {
  try {
    await pool.query(
      'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
      [deliveryId, eventType, JSON.stringify(payload)]
    );
  } catch (error) {
    console.error('Failed to log event to Postgres:', error);
  }
}

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver'),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver'),
    drivers: async () => await Driver.find(),
    driver: async (_, { id }) => await Driver.findById(id),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
      try {
        const response = await axios.post(process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize', {
          locations
        }, { timeout: 10000 });
        return {
          optimizedLocations: response.data.optimized_route,
          totalDistance: response.data.total_distance
        };
      } catch (error) {
        console.error('Optimization service error:', error);
        throw new Error('Failed to optimize route');
      }
    }
  },
  Mutation: {
    createDriver: async (_, { name, email, vehicleInfo }) => {
      const driver = new Driver({ name, email, vehicleInfo });
      return await driver.save();
    },
    createCustomer: async (_, { name, email, phone, address }) => {
      const customer = new Customer({ name, email, phone, address });
      return await customer.save();
    },
    createDelivery: async (_, { customerId, origin, destination, payload }) => {
      const { pool } = await db.getDB();
      const delivery = new Delivery({ customer: customerId, origin, destination, payload });
      const savedDelivery = await delivery.save();

      await logEvent(pool, savedDelivery._id.toString(), 'DELIVERY_CREATED', { origin, destination });

      return await savedDelivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { redis, pool, mongoose } = await db.getDB();
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const driver = await Driver.findById(driverId).session(session);
        if (!driver) throw new Error('Driver not found');

        driver.status = 'BUSY';
        await driver.save({ session });

        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { driver: driverId, status: 'ASSIGNED' },
          { new: true, session }
        ).populate('customer').populate('driver');

        if (!delivery) throw new Error('Delivery not found');

        await redis.set(`driver:${driverId}:status`, 'BUSY');
        await logEvent(pool, deliveryId, 'DRIVER_ASSIGNED', { driverId });

        await session.commitTransaction();
        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    },
    updateDriverStatus: async (_, { id, status }) => {
      const { redis } = await db.getDB();
      const driver = await Driver.findById(id);
      if (!driver) throw new Error('Driver not found');

      driver.status = status;
      await driver.save();
      await redis.set(`driver:${id}:status`, status);
      return driver;
    }
  },
  Delivery: {
    customer: async (parent) => {
      if (parent.customer && parent.customer.name) return parent.customer;
      return await Customer.findById(parent.customer);
    },
    driver: async (parent) => {
      if (parent.driver && parent.driver.name) return parent.driver;
      if (!parent.driver) return null;
      return await Driver.findById(parent.driver);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.getDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
