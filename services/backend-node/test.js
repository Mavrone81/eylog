const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Backend Tests', () => {
  it('should have required types in schema', () => {
    assert.ok(typeDefs.includes('type Delivery'), 'Missing Delivery type');
    assert.ok(typeDefs.includes('type Driver'), 'Missing Driver type');
    assert.ok(typeDefs.includes('type Customer'), 'Missing Customer type');
    assert.ok(typeDefs.includes('type Route'), 'Missing Route type');
  });

  it('should have Query and Mutation resolvers defined', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.delivery, 'function');
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.customers, 'function');

    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });

  it('should verify schema defines proper mutations', () => {
    assert.ok(typeDefs.includes('createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery'));
    assert.ok(typeDefs.includes('assignDriver(deliveryId: ID!, driverId: ID!): Delivery'));
    assert.ok(typeDefs.includes('optimizeRoute(locations: [LocationInput]!): Route'));
  });

  it('should verify schema defines proper input types', () => {
    assert.ok(typeDefs.includes('input LocationInput'));
    assert.ok(typeDefs.includes('lat: Float'));
    assert.ok(typeDefs.includes('lng: Float'));
  });
});
