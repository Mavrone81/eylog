const axios = require('axios');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');

const resolvers = {
  Query: {
    deliveries: async () => {
      const deliveries = await Delivery.find().populate('driverId').populate('customerId');
      return deliveries.map(d => {
        const obj = d.toObject();
        return {
          ...obj,
          id: d._id.toString(),
          driver: obj.driverId,
          customer: obj.customerId,
        };
      });
    },
    delivery: async (_, { id }) => {
      const d = await Delivery.findById(id).populate('driverId').populate('customerId');
      if (!d) return null;
      const obj = d.toObject();
      return {
        ...obj,
        id: d._id.toString(),
        driver: obj.driverId,
        customer: obj.customerId,
      };
    },
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }, { pythonServiceUrl }) => {
      try {
        const response = await axios.post(`${pythonServiceUrl}/optimize`, { locations });
        return response.data;
      } catch (error) {
        console.error('Error calling Python service:', error.message);
        throw new Error('Failed to optimize route');
      }
    },
  },
  Mutation: {
    createDelivery: async (_, { origin, destination, customerId }, { pgPool }) => {
      const delivery = new Delivery({ origin, destination, customerId });
      await delivery.save();

      if (pgPool) {
        await pgPool.query(
          'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
          [delivery.id, 'CREATED', JSON.stringify({ origin, destination, customerId })]
        );
      }

      return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }, { redisClient }) => {
      const delivery = await Delivery.findById(deliveryId);
      if (!delivery) throw new Error('Delivery not found');

      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      await delivery.save();

      const driver = await Driver.findById(driverId);
      if (driver) {
        driver.status = 'BUSY';
        await driver.save();

        if (redisClient) {
          await redisClient.set(`driver:${driverId}:status`, 'BUSY');
        }
      }

      return delivery;
    },
    updateDriverStatus: async (_, { id, status }, { redisClient }) => {
      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (redisClient) {
        await redisClient.set(`driver:${id}:status`, status);
      }
      return driver;
    },
    createDriver: async (_, args) => {
      const driver = new Driver(args);
      return await driver.save();
    },
    createCustomer: async (_, args) => {
      const customer = new Customer(args);
      return await customer.save();
    },
  },
};

module.exports = resolvers;
