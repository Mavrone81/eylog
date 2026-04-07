const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have basic resolvers defined', () => {
    assert.ok(resolvers.Query.deliveries);
    assert.ok(resolvers.Query.drivers);
    assert.ok(resolvers.Query.customers);
    assert.ok(resolvers.Mutation.createDelivery);
    assert.ok(resolvers.Mutation.createDriver);
    assert.ok(resolvers.Mutation.assignDriver);
  });

  it('should contain expected types in typeDefs', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Location'));
    assert.ok(typeDefs.includes('input LocationInput'));
  });
});
