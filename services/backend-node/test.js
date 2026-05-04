const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have deliveries query', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have createDelivery mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have assignDriver mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });
});
