const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { DateTimeResolver } = require('graphql-scalars');
const axios = require('axios');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const { sendSMS } = require('./utils/sms');

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
    name: String!
    vehicle_type: String!
    status: String!
    current_location: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String
    address: Location
  }

  type Delivery {
    id: ID!
    customer: Customer
    driver: Driver
    status: String
    origin: Location
    destination: Location
    total_distance_km: Float
    createdAt: DateTime
    updatedAt: DateTime
  }

  type OptimizedRoute {
    optimized_route: [Location]
    status: String
    message: String
    total_distance_km: Float
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
    delivery(id: ID!): Delivery
  }

  type Mutation {
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDeliveryStatus(id: ID!, status: String!): Delivery
    updateDriverLocation(id: ID!, location: LocationInput!): Driver
    optimizeRoute(locations: [LocationInput]!): OptimizedRoute
  }
`;

const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    deliveries: async () => await Delivery.find().populate('customer').populate('driver').exec(),
    drivers: async () => await Driver.find().exec(),
    customers: async () => await Customer.find().exec(),
    delivery: async (_, { id }) => await Delivery.findById(id).populate('customer').populate('driver').exec(),
  },
  Mutation: {
    createDelivery: async (_, { customerId, origin, destination }) => {
      // Basic input validation
      if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
        throw new Error('Invalid coordinates');
      }

      const delivery = new Delivery({
        customer: customerId,
        origin,
        destination,
        status: 'PENDING'
      });
      await delivery.save();

      const populatedDelivery = await delivery.populate('customer');
      if (populatedDelivery.customer && populatedDelivery.customer.phone) {
        sendSMS(populatedDelivery.customer.phone, `Your delivery to ${destination.address} has been created.`);
      }

      const { pgPool } = db.getDB();
      await pgPool.query(
        'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
        [delivery.id, 'DELIVERY_CREATED', JSON.stringify(delivery)]
      );

      return delivery.populate('customer');
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
      const { mongooseConnection, pgPool, redisClient } = db.getDB();
      const session = await mongooseConnection.startSession();
      session.startTransaction();
      try {
        const driver = await Driver.findById(driverId).session(session);
        if (!driver || driver.status !== 'AVAILABLE') {
          throw new Error('Driver not available');
        }

        const delivery = await Delivery.findByIdAndUpdate(
          deliveryId,
          { driver: driverId, status: 'ASSIGNED' },
          { new: true, session }
        ).populate('customer').populate('driver').exec();

        if (!delivery) {
          throw new Error('Delivery not found');
        }

        driver.status = 'BUSY';
        await driver.save({ session });

        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [deliveryId, 'DRIVER_ASSIGNED', JSON.stringify({ driverId })]
        );

        await session.commitTransaction();

        if (delivery.customer && delivery.customer.phone) {
          sendSMS(delivery.customer.phone, `Driver ${driver.name} has been assigned to your delivery.`);
        }

        // Update Redis cache for driver status
        await redisClient.set(`driver:${driverId}:status`, 'BUSY');

        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    },
    updateDeliveryStatus: async (_, { id, status }) => {
      const { mongooseConnection, pgPool, redisClient } = db.getDB();
      const session = await mongooseConnection.startSession();
      session.startTransaction();
      try {
        const delivery = await Delivery.findByIdAndUpdate(
          id,
          { status },
          { new: true, session }
        ).populate('customer').populate('driver').exec();

        if (!delivery) {
          throw new Error('Delivery not found');
        }

        if ((status === 'DELIVERED' || status === 'CANCELLED') && delivery.driver) {
          const driverId = delivery.driver._id || delivery.driver;
          const driver = await Driver.findById(driverId).session(session);
          if (driver) {
            driver.status = 'AVAILABLE';
            await driver.save({ session });
            await redisClient.set(`driver:${driverId}:status`, 'AVAILABLE');
          }
        }

        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, payload) VALUES ($1, $2, $3)',
          [id, 'STATUS_UPDATED', JSON.stringify({ status })]
        );

        await session.commitTransaction();

        if (delivery.customer && delivery.customer.phone) {
          sendSMS(delivery.customer.phone, `Your delivery status has been updated to: ${status}`);
        }

        return delivery;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    },
    updateDriverLocation: async (_, { id, location }) => {
      const { redisClient } = db.getDB();
      const driver = await Driver.findByIdAndUpdate(
        id,
        { current_location: location },
        { new: true }
      ).exec();

      if (!driver) {
        throw new Error('Driver not found');
      }

      await redisClient.set(`driver:${id}:location`, JSON.stringify(location));
      return driver;
    },
    optimizeRoute: async (_, { locations }) => {
      const url = process.env.OPTIMIZATION_SERVICE_URL || 'http://localhost:5000/optimize';
      try {
        const response = await axios.post(url, { locations }, { timeout: 10000 });
        return response.data;
      } catch (error) {
        console.error('Optimization service error:', error.message);
        throw new Error('Failed to optimize route');
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  db.initDB().then(() => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
