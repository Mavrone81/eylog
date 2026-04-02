const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have a createDelivery mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have an assignDriver mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });

  it('should have a deliveries query', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });
});
