const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should define createDelivery mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should define assignDriver mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });

  it('should define optimizeRoute mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.optimizeRoute, 'function');
  });

  it('should define deliveries query', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should define drivers and customers queries', () => {
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.customers, 'function');
  });

  it('should define the schema types', () => {
    assert(typeDefs.includes('type Delivery'));
    assert(typeDefs.includes('type Driver'));
    assert(typeDefs.includes('type Customer'));
    assert(typeDefs.includes('type Route'));
  });
});
