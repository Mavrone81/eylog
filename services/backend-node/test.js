const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have a deliveries query', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have a createDriver mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
  });

  it('should have a createDelivery mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have an optimizeRoute query', () => {
    assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
  });
});
