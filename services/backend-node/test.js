const { expect } = require('chai');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have basic queries and mutations', () => {
    expect(resolvers.Query).to.have.property('deliveries');
    expect(resolvers.Mutation).to.have.property('createDelivery');
  });

  // More unit tests can be added here, mocking DB/External calls if necessary
});
