const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the correct types defined in schema', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Mutation'));
  });

  it('should have resolvers for queries', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
  });

  it('should have resolvers for mutations', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });
});
