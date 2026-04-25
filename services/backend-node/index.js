require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const { connectDB } = require('./db');
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
    vehicleType: String!
    currentLocation: Location
  }

  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
  }

  type Delivery {
    id: ID!
    status: String!
    origin: Location!
    destination: Location!
    customer: Customer
    driver: Driver
  }

  type Route {
    optimizedLocations: [Location]
    totalDistance: Float
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    customers: [Customer]
    optimizeRoute(locations: [LocationInput]!): Route
  }

  type Mutation {
    createDriver(name: String!, phone: String!, vehicleType: String!): Driver
    createCustomer(name: String!, email: String!, phone: String!, address: String!): Customer
    createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
    updateDriverStatus(driverId: ID!, status: String!): Driver
  }
`;

const resolvers = {
  Query: {
    deliveries: async () => await Delivery.find(),
    drivers: async () => await Driver.find(),
    customers: async () => await Customer.find(),
    optimizeRoute: async (_, { locations }) => {
        try {
            const response = await axios.post(`${process.env.PYTHON_SERVICE_URL}/optimize`, { locations });
            return {
                optimizedLocations: response.data.optimized_route,
                totalDistance: response.data.total_distance
            };
        } catch (error) {
            console.error('Error optimizing route:', error);
            throw new Error('Failed to optimize route');
        }
    }
  },
  Delivery: {
    customer: async (parent) => {
        if (parent.customer && parent.customer.name) return parent.customer;
        return await Customer.findById(parent.customerId);
    },
    driver: async (parent) => {
        if (parent.driver && parent.driver.name) return parent.driver;
        if (!parent.driverId) return null;
        return await Driver.findById(parent.driverId);
    }
  },
  Mutation: {
    createDriver: async (_, args) => {
        const driver = new Driver(args);
        return await driver.save();
    },
    createCustomer: async (_, args) => {
        const customer = new Customer(args);
        return await customer.save();
    },
    createDelivery: async (_, { customerId, origin, destination }) => {
        const delivery = new Delivery({ customerId, origin, destination, status: 'PENDING' });
        await delivery.save();

        if (global.pgClient) {
            await global.pgClient.query(
                'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
                [delivery.id.toString(), 'CREATED', JSON.stringify({ customerId, origin, destination })]
            );
        }

        return delivery;
    },
    assignDriver: async (_, { deliveryId, driverId }) => {
        const delivery = await Delivery.findById(deliveryId);
        if (!delivery) throw new Error('Delivery not found');

        const driver = await Driver.findById(driverId);
        if (!driver) throw new Error('Driver not found');

        delivery.driverId = driverId;
        delivery.status = 'ASSIGNED';
        await delivery.save();

        driver.status = 'BUSY';
        await driver.save();

        if (global.redisClient) {
            await global.redisClient.set(`driver:${driverId}:status`, 'BUSY');
        }

        if (global.pgClient) {
            await global.pgClient.query(
                'INSERT INTO delivery_events (delivery_id, event_type, metadata) VALUES ($1, $2, $3)',
                [deliveryId, 'ASSIGNED', JSON.stringify({ driverId })]
            );
        }

        return delivery;
    },
    updateDriverStatus: async (_, { driverId, status }) => {
        const driver = await Driver.findById(driverId);
        if (!driver) throw new Error('Driver not found');

        driver.status = status;
        await driver.save();

        if (global.redisClient) {
            await global.redisClient.set(`driver:${driverId}:status`, status);
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
  connectDB().then(({ redisClient, pgClient }) => {
    // Inject dependencies into context if needed, or use them globally/via module
    global.redisClient = redisClient;
    global.pgClient = pgClient;

    startStandaloneServer(server, {
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  });
}

module.exports = { typeDefs, resolvers, server };
