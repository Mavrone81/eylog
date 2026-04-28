const assert = require('assert');
const { typeDefs, resolvers } = require('./index');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

// Mocking models and db for testing in restricted environment
describe('GraphQL Resolvers', () => {
  it('should have the correct Query resolvers', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Query.customers, 'function');
    assert.strictEqual(typeof resolvers.Query.optimizeRoute, 'function');
  });

  it('should have the correct Mutation resolvers', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createCustomer, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    assert.strictEqual(typeof resolvers.Mutation.updateDriverStatus, 'function');
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });

  it('should define the schema correctly', () => {
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Customer'));
    assert.ok(typeDefs.includes('type Route'));
  });
});
