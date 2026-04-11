const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the correct type definitions', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Route'));
  });

  it('should have queries for deliveries, drivers, and customers', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.customers, 'function');
  });

  it('should have mutations for creating entities and assigning drivers', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createCustomer, 'function');
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });
});
