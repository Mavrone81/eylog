const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the required Query typeDefs', () => {
    assert.ok(typeDefs.includes('type Query'));
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
    assert.ok(typeDefs.includes('optimizeRoute(locations: [LocationInput]!): Route'));
  });

  it('should have the required Mutation typeDefs', () => {
    assert.ok(typeDefs.includes('type Mutation'));
    assert.ok(typeDefs.includes('createDelivery'));
    assert.ok(typeDefs.includes('assignDriver'));
    assert.ok(typeDefs.includes('updateDriverStatus'));
    assert.ok(typeDefs.includes('createCustomer'));
    assert.ok(typeDefs.includes('createDriver'));
  });

  describe('Resolvers Structure', () => {
    it('should have Query resolvers', () => {
      assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
      assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
    });

    it('should have Mutation resolvers', () => {
      assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
      assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
      assert.strictEqual(typeof resolvers.Mutation.updateDriverStatus, 'function');
      assert.strictEqual(typeof resolvers.Mutation.createCustomer, 'function');
      assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
    });
  });
});
