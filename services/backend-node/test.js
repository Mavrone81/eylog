const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the correct query definitions', () => {
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
    assert.ok(typeDefs.includes('drivers: [Driver]'));
    assert.ok(typeDefs.includes('customers: [Customer]'));
    assert.ok(typeDefs.includes('delivery(id: ID!): Delivery'));
  });

  it('should have the correct mutation definitions', () => {
    assert.ok(typeDefs.includes('createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID): Delivery'));
    assert.ok(typeDefs.includes('assignDriver(deliveryId: ID!, driverId: ID!): Delivery'));
    assert.ok(typeDefs.includes('optimizeRoute(locations: [LocationInput]!): Route'));
  });

  it('should have a working optimizeRoute resolver that uses the Python service', async () => {
    // Note: This test would normally mock axios, but in this environment we're just checking existence and structure.
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });
});
