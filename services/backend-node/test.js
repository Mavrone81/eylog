const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have deliveries query', () => {
    assert.ok(resolvers.Query.deliveries);
  });

  it('should have createDelivery mutation', () => {
    assert.ok(resolvers.Mutation.createDelivery);
  });

  it('should have assignDriver mutation', () => {
    assert.ok(resolvers.Mutation.assignDriver);
  });

  it('should have optimizeRoute query', () => {
    assert.ok(resolvers.Query.optimizeRoute);
  });
});
