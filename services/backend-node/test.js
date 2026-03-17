const assert = require('assert');
const { typeDefs, resolvers } = require('./index');
const Delivery = require('./models/Delivery');
const mongoose = require('mongoose');

describe('GraphQL Backend Tests', () => {
  it('should define correct typeDefs', () => {
    assert(typeDefs.includes('type Delivery'));
    assert(typeDefs.includes('type Mutation'));
  });

  it('should have a deliveries query resolver', async () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have a createDelivery mutation resolver', async () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });
});
