const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have all expected types in the schema', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Location'));
    assert.ok(typeDefs.includes('type Route'));
  });

  it('should have basic resolvers defined', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });

  it('Delivery customer resolver should return customerId', () => {
    const parent = { customerId: 'cust123' };
    const result = resolvers.Delivery.customer(parent);
    assert.strictEqual(result, 'cust123');
  });
});
