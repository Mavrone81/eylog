const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have correct Queries and Mutations', () => {
    assert.ok(resolvers.Query.deliveries);
    assert.ok(resolvers.Query.delivery);
    assert.ok(resolvers.Query.optimizeRoute);
    assert.ok(resolvers.Mutation.createDriver);
    assert.ok(resolvers.Mutation.updateDriverStatus);
    assert.ok(resolvers.Mutation.createCustomer);
    assert.ok(resolvers.Mutation.createDelivery);
    assert.ok(resolvers.Mutation.assignDriver);
  });
});
