const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Backend Tests', () => {
  it('should have a valid schema with deliveries query', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(resolvers.Query.deliveries);
  });

  it('should have a valid schema with createDelivery mutation', () => {
    assert.ok(typeDefs.includes('createDelivery'));
    assert.ok(resolvers.Mutation.createDelivery);
  });

  it('should have a valid schema with assignDriver mutation', () => {
    assert.ok(resolvers.Mutation.assignDriver);
  });
});
