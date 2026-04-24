const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have necessary type definitions', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Route'));
  });

  it('should have essential queries and mutations', () => {
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
    assert.ok(typeDefs.includes('optimizeRoute(locations: [LocationInput]!): Route'));
    assert.ok(typeDefs.includes('createDelivery(customerId: ID!, origin: LocationInput!, destination: LocationInput!): Delivery'));
    assert.ok(typeDefs.includes('assignDriver(deliveryId: ID!, driverId: ID!): Delivery'));
    assert.ok(typeDefs.includes('updateDriverStatus(id: ID!, status: String!): Driver'));
  });

  describe('Resolvers Structure', () => {
    it('should have Query resolvers', () => {
      assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
      assert.strictEqual(typeof resolvers.Query.delivery, 'function');
      assert.strictEqual(typeof resolvers.Query.drivers, 'function');
      assert.strictEqual(typeof resolvers.Query.customers, 'function');
      assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
    });

    it('should have Mutation resolvers', () => {
      assert.strictEqual(typeof resolvers.Mutation.createCustomer, 'function');
      assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
      assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
      assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
      assert.strictEqual(typeof resolvers.Mutation.updateDriverStatus, 'function');
    });

    it('should have Delivery resolvers', () => {
      assert.strictEqual(typeof resolvers.Delivery.customer, 'function');
      assert.strictEqual(typeof resolvers.Delivery.driver, 'function');
    });
  });
});
