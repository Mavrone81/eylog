const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have a Query type with deliveries', () => {
    assert.ok(typeDefs.includes('type Query'));
    assert.ok(typeDefs.includes('deliveries: [Delivery]'));
  });

  it('should have mutations for delivery and driver management', () => {
    assert.ok(typeDefs.includes('createDelivery'));
    assert.ok(typeDefs.includes('assignDriver'));
    assert.ok(typeDefs.includes('updateDriverStatus'));
  });

  it('should define a Delivery type with expected fields', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('customerId: ID!'));
    assert.ok(typeDefs.includes('driverId: ID'));
    assert.ok(typeDefs.includes('status: String!'));
  });

  // Mock-based testing for resolvers can be added here if needed
  // In a real environment, we'd use Apollo Server Testing or a similar library
  it('resolvers should be an object', () => {
    assert.strictEqual(typeof resolvers, 'object');
    assert.strictEqual(typeof resolvers.Query, 'object');
    assert.strictEqual(typeof resolvers.Mutation, 'object');
  });
});
