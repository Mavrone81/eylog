const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers Type Checks', () => {
  it('should have deliveries query', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have delivery query', () => {
    assert.strictEqual(typeof resolvers.Query.delivery, 'function');
  });

  it('should have createDelivery mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have assignDriver mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });

  it('should have optimizeRoute mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });
});
