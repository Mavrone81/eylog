const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have drivers query', () => {
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
  });

  it('should have createDelivery mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have optimizeRoute query', () => {
    assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
  });
});
