const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have typeDefs and resolvers defined', () => {
    assert.ok(typeDefs);
    assert.ok(resolvers);
  });

  it('should have Query and Mutation in resolvers', () => {
    assert.ok(resolvers.Query);
    assert.ok(resolvers.Mutation);
  });

  it('should have expected Query resolvers', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
  });

  it('should have expected Mutation resolvers', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.updateDriverStatus, 'function');
  });
});
