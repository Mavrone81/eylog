const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have Query and Mutation resolvers', () => {
    assert.ok(resolvers.Query);
    assert.ok(resolvers.Mutation);
  });

  it('should have deliveries query', () => {
    assert.ok(resolvers.Query.deliveries);
  });

  it('should have createDelivery mutation', () => {
    assert.ok(resolvers.Mutation.createDelivery);
  });
});
