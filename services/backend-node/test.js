const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have deliveries query resolver', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have createDelivery mutation resolver', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have updateDriverStatus mutation resolver', () => {
    assert.strictEqual(typeof resolvers.Mutation.updateDriverStatus, 'function');
  });
});
