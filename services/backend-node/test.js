const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the required types in schema', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Route'));
  });

  it('should have expected queries', () => {
    assert.ok(resolvers.Query.deliveries);
    assert.ok(resolvers.Query.drivers);
    assert.ok(resolvers.Query.customers);
    assert.ok(resolvers.Query.optimizeRoute);
  });

  it('should have expected mutations', () => {
    assert.ok(resolvers.Mutation.createDriver);
    assert.ok(resolvers.Mutation.createCustomer);
    assert.ok(resolvers.Mutation.createDelivery);
    assert.ok(resolvers.Mutation.assignDriver);
    assert.ok(resolvers.Mutation.updateDriverStatus);
  });
});
