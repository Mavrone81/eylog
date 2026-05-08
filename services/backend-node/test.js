const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema and Resolvers', () => {
  it('should have the correct type definitions', () => {
    assert.ok(typeDefs.includes('type Driver'));
    assert.ok(typeDefs.includes('type Delivery'));
    assert.ok(typeDefs.includes('type Customer'));
  });

  it('should have resolvers for Query and Mutation', () => {
    assert.ok(resolvers.Query);
    assert.ok(resolvers.Mutation);
    assert.strictEqual(typeof resolvers.Query.drivers, 'function');
    assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
  });

  describe('Delivery resolvers', () => {
      it('should handle customer resolution', async () => {
          const parent = { customerId: '123', customer: { name: 'Test' } };
          const result = await resolvers.Delivery.customer(parent);
          assert.strictEqual(result.name, 'Test');
      });

      it('should handle driver resolution when null', async () => {
          const parent = { driverId: null };
          const result = await resolvers.Delivery.driver(parent);
          assert.strictEqual(result, null);
      });
  });
});
