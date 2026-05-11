const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL API', () => {
  it('should have deliveries query', () => {
    assert.ok(resolvers.Query.deliveries);
  });

  it('should have Driver mutations', () => {
    assert.ok(resolvers.Mutation.createDriver);
    assert.ok(resolvers.Mutation.updateDriverStatus);
  });

  it('should have Customer mutations', () => {
    assert.ok(resolvers.Mutation.createCustomer);
  });

  it('should have Delivery mutations', () => {
    assert.ok(resolvers.Mutation.createDelivery);
    assert.ok(resolvers.Mutation.assignDriver);
  });

  it('should have optimizeRoute query', () => {
    assert.ok(resolvers.Query.optimizeRoute);
  });
});
