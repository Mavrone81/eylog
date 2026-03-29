const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Backend Tests', () => {
  it('should have typeDefs and resolvers defined', () => {
    assert.ok(typeDefs);
    assert.ok(resolvers);
  });

  it('should have basic query resolvers', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.delivery, 'function');
  });

  it('should have mutation resolvers', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });
});
