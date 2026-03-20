const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Backend Tests', () => {
  it('should have basic GraphQL types defined', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Location'));
    assert.ok(typeDefs.includes('type Route'));
  });

  it('should have required queries defined', () => {
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
    assert.ok(typeDefs.includes('drivers: [Driver]'));
    assert.ok(typeDefs.includes('customers: [Customer]'));
  });

  it('should have required mutations defined', () => {
    assert.ok(typeDefs.includes('createDelivery'));
    assert.ok(typeDefs.includes('assignDriver'));
    assert.ok(typeDefs.includes('optimizeRoute'));
  });

  it('should have resolvers for queries and mutations', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });
});
