const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the correct Query type definitions', () => {
    assert(typeDefs.includes('type Query'));
    assert(typeDefs.includes('deliveries: [Delivery]'));
    assert(typeDefs.includes('drivers: [Driver]'));
  });

  it('should have the correct Mutation type definitions', () => {
    assert(typeDefs.includes('type Mutation'));
    assert(typeDefs.includes('createDelivery'));
    assert(typeDefs.includes('assignDriver'));
  });

  describe('Resolvers', () => {
    it('should have Query and Mutation resolvers', () => {
      assert(resolvers.Query);
      assert(resolvers.Mutation);
    });

    it('Query.deliveries should be a function', () => {
      assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    });

    it('Mutation.createDelivery should be a function', () => {
      assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    });

    it('Mutation.optimizeRoute should be a function', () => {
      assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
    });
  });
});
