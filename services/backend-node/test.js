const { expect } = require('chai');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Schema & Resolvers', () => {
  it('should have deliveries query', () => {
    expect(resolvers.Query.deliveries).to.be.a('function');
  });

  it('should have createDelivery mutation', () => {
    expect(resolvers.Mutation.createDelivery).to.be.a('function');
  });

  it('should have assignDriver mutation', () => {
    expect(resolvers.Mutation.assignDriver).to.be.a('function');
  });

  it('should have optimizeRoute mutation', () => {
    expect(resolvers.Mutation.optimizeRoute).to.be.a('function');
  });
});
