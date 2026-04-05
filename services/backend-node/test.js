const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the required types in schema', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Route'));
  });

  it('should have the required queries and mutations', () => {
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
    assert.ok(typeDefs.includes('createDelivery(origin: LocationInput!, destination: LocationInput!, customerId: ID!): Delivery'));
  });

  it('Query.deliveries should be a function', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('Mutation.createDelivery should be a function', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('Mutation.assignDriver should be a function', () => {
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });
});
