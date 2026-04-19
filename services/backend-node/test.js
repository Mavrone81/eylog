const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have deliveries query', () => {
    assert.ok(resolvers.Query.deliveries);
  });

  it('should have createDelivery mutation', () => {
    assert.ok(resolvers.Mutation.createDelivery);
  });

  it('should have assignDriver mutation', () => {
    assert.ok(resolvers.Mutation.assignDriver);
  });

  // Mock tests for basic logic without DB connection
  it('should define correct typeDefs', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
  });
});
