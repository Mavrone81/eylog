const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL API', () => {
  it('should have typeDefs and resolvers', () => {
    assert.ok(typeDefs);
    assert.ok(resolvers);
  });

  describe('Resolvers', () => {
    it('should have Query and Mutation resolvers', () => {
      assert.ok(resolvers.Query);
      assert.ok(resolvers.Mutation);
    });

    it('should have createDriver mutation', () => {
      assert.strictEqual(typeof resolvers.Mutation.createDriver, 'function');
    });

    it('should have createDelivery mutation', () => {
      assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
    });
  });
});
