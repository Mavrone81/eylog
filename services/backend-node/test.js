const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the required Query fields', () => {
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
    assert.ok(typeDefs.includes('optimizeRoute(locations: [LocationInput]!): Route'));
  });

  it('should have the required Mutation fields', () => {
    assert.ok(typeDefs.includes('createDelivery'));
    assert.ok(typeDefs.includes('assignDriver'));
  });

  it('should define resolvers for Queries and Mutations', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
  });
});
