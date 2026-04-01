const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Backend Tests', () => {
  it('should have correct type definitions', () => {
    assert(typeDefs.includes('type Delivery'));
    assert(typeDefs.includes('type Driver'));
    assert(typeDefs.includes('type Customer'));
    assert(typeDefs.includes('type Route'));
  });

  it('should have resolvers for queries and mutations', () => {
    assert(resolvers.Query.deliveries);
    assert(resolvers.Query.drivers);
    assert(resolvers.Mutation.createDelivery);
    assert(resolvers.Mutation.assignDriver);
    assert(resolvers.Mutation.optimizeRoute);
  });
});
