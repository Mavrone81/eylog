const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the correct type definitions', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Route'));
  });

  it('should have Query and Mutation resolvers', () => {
    assert.ok(resolvers.Query);
    assert.ok(resolvers.Mutation);
  });

  it('should have specific resolvers for deliveries, drivers, and customers', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.customers, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });
});
