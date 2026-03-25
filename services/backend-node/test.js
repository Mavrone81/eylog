const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Backend', () => {
  it('should have basic query types defined', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
  });

  it('should have basic mutations defined', () => {
    assert.ok(typeDefs.includes('createDelivery'));
    assert.ok(typeDefs.includes('assignDriver'));
    assert.ok(typeDefs.includes('optimizeRoute'));
  });

  describe('Resolvers Structure', () => {
    it('Query resolvers should be functions', () => {
        assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
        assert.strictEqual(typeof resolvers.Query.delivery, 'function');
        assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    });

    it('Mutation resolvers should be functions', () => {
        assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
        assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
        assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
    });
  });
});
