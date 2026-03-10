const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should define the required queries', () => {
    assert.ok(resolvers.Query.deliveries);
    assert.ok(resolvers.Query.delivery);
    assert.ok(resolvers.Query.drivers);
    assert.ok(resolvers.Query.customers);
    assert.ok(resolvers.Query.getOptimizedRoute);
  });

  it('should define the required mutations', () => {
    assert.ok(resolvers.Mutation.createDelivery);
    assert.ok(resolvers.Mutation.assignDriver);
    assert.ok(resolvers.Mutation.updateDeliveryStatus);
    assert.ok(resolvers.Mutation.createDriver);
    assert.ok(resolvers.Mutation.createCustomer);
  });
});
