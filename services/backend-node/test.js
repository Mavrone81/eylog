const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have deliveries query', () => {
    assert.ok(resolvers.Query.deliveries);
  });

  it('should have drivers query', () => {
    assert.ok(resolvers.Query.drivers);
  });

  it('should have customers query', () => {
    assert.ok(resolvers.Query.customers);
  });

  it('should have createDelivery mutation', () => {
    assert.ok(resolvers.Mutation.createDelivery);
  });

  it('should have assignDriver mutation', () => {
    assert.ok(resolvers.Mutation.assignDriver);
  });

  it('should have optimizeRoute mutation', () => {
    assert.ok(resolvers.Mutation.optimizeRoute);
  });
});
