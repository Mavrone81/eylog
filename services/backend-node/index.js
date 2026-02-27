const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

const typeDefs = `#graphql
  type Delivery {
    id: ID!
    status: String
    origin: String
    destination: String
  }

  type Query {
    deliveries: [Delivery]
  }
`;

const deliveries = [
  {
    id: '1',
    status: 'IN_TRANSIT',
    origin: 'Distribution Center A',
    destination: '123 Main St',
  },
];

const resolvers = {
  Query: {
    deliveries: () => deliveries,
  },
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
