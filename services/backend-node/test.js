const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have basic query resolvers', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.customers, 'function');
  });

  it('should have basic mutation resolvers', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createCustomer, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.updateDriverStatus, 'function');
  });
});
