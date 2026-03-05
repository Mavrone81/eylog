const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

const typeDefs = `#graphql
  type Location {
    lat: Float!
    lng: Float!
    address: String
  }

  type Delivery {
    id: ID!
    status: String!
    origin: Location!
    destination: Location!
    driverId: ID
  }

  type Driver {
    id: ID!
    name: String!
    status: String!
    currentLocation: Location
  }

  type Route {
    id: ID!
    driverId: ID!
    deliveryIds: [ID!]!
    optimizedPath: [Location!]!
  }

  type Query {
    deliveries: [Delivery]
    drivers: [Driver]
    routes: [Route]
  }

  type Mutation {
    createDelivery(originLat: Float!, originLng: Float!, destLat: Float!, destLng: Float!): Delivery
    assignDriver(deliveryId: ID!, driverId: ID!): Delivery
  }
`;

let deliveries = [
  {
    id: '1',
    status: 'IN_TRANSIT',
    origin: { lat: 40.7128, lng: -74.0060, address: 'Distribution Center A' },
    destination: { lat: 40.7306, lng: -73.9352, address: '123 Main St' },
    driverId: 'd1'
  },
];

let drivers = [
  { id: 'd1', name: 'John Doe', status: 'ACTIVE', currentLocation: { lat: 40.7128, lng: -74.0060 } }
];

let routes = [];

const resolvers = {
  Query: {
    deliveries: () => deliveries,
    drivers: () => drivers,
    routes: () => routes,
  },
  Mutation: {
    createDelivery: (_, { originLat, originLng, destLat, destLng }) => {
      const newDelivery = {
        id: String(deliveries.length + 1),
        status: 'PENDING',
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
      };
      deliveries.push(newDelivery);
      return newDelivery;
    },
    assignDriver: (_, { deliveryId, driverId }) => {
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (!delivery) throw new Error('Delivery not found');
      delivery.driverId = driverId;
      delivery.status = 'ASSIGNED';
      return delivery;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  startStandaloneServer(server, {
    listen: { port: 4000 },
  }).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { typeDefs, resolvers, server };
