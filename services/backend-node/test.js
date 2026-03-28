const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Backend Tests', () => {
  it('should have a valid Query.deliveries resolver', async () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have a valid Mutation.createDelivery resolver', async () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have a valid Mutation.assignDriver resolver', async () => {
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });

  it('should define the Delivery type in schema', () => {
    assert.ok(typeDefs.includes('type Delivery'));
  });

  describe('Resolver Logic (Mocked)', () => {
    it('optimizeRoute should attempt to call Python service', async () => {
      // This test just ensures the resolver is structured correctly
      assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
    });
  });
});
