const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL API', () => {
  it('should have the correct schema defined', () => {
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('optimizeRoute'));
  });

  it('should have resolvers for Queries', () => {
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.customers, 'function');
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
  });

  it('should have resolvers for Mutations', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createCustomer, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });
});
