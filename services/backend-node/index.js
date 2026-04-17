require('dotenv').config();
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { connectDB } = require('./db');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

if (require.main === module) {
  connectDB().then(({ pgPool, redisClient }) => {
    startStandaloneServer(server, {
      listen: { port: 4000 },
      context: async () => ({
        pgPool,
        redisClient,
        pythonServiceUrl,
      }),
    }).then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  }).catch(err => {
    console.error('Failed to connect to databases', err);
    process.exit(1);
  });
}

module.exports = { typeDefs, resolvers, server };
