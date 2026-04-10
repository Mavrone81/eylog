const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have typeDefs and resolvers defined', () => {
    assert.ok(typeDefs);
    assert.ok(resolvers);
  });

  describe('Queries', () => {
    it('should have basic query resolvers', () => {
      assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
      assert.strictEqual(typeof resolvers.Query.drivers, 'function');
      assert.strictEqual(typeof resolvers.Query.customers, 'function');
    });
  });

  describe('Mutations', () => {
    it('should have basic mutation resolvers', () => {
      assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
      assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
      assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
    });
  });
});
