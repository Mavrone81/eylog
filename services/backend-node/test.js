const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the correct Query type', () => {
    assert.ok(typeDefs.includes('type Query'));
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
    assert.ok(typeDefs.includes('optimizeRoute(locations: [LocationInput]!): Route'));
  });

  it('should have the correct Mutation type', () => {
    assert.ok(typeDefs.includes('type Mutation'));
    assert.ok(typeDefs.includes('createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery'));
  });

  it('should have defined resolvers for queries', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
  });

  it('should have defined resolvers for mutations', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });
});
