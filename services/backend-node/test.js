const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have typeDefs and resolvers defined', () => {
    assert.ok(typeDefs);
    assert.ok(resolvers);
  });

  describe('Queries', () => {
    it('should have deliveries, drivers, and customers queries', () => {
      assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
      assert.strictEqual(typeof resolvers.Query.drivers, 'function');
      assert.strictEqual(typeof resolvers.Query.customers, 'function');
    });
  });

  describe('Mutations', () => {
    it('should have core mutations defined', () => {
      assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
      assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
      assert.strictEqual(typeof resolvers.Mutation.updateDriverStatus, 'function');
      assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
    });
  });
});
