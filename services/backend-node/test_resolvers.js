const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have a deliveries query resolver', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have a createDelivery mutation resolver', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });
});
