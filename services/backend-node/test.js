const assert = require('assert');
const sinon = require('sinon');
const request = require('supertest');
const { ApolloServer } = require('@apollo/server');
const { typeDefs, resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let server;

  before(() => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should update driver status', async () => {
    const mockDriver = { id: '1', status: 'AVAILABLE', save: sinon.stub() };
    const findByIdAndUpdateStub = sinon.stub(Driver, 'findByIdAndUpdate').resolves(mockDriver);

    const mockRedis = { set: sinon.stub().resolves() };
    const mockPool = { query: sinon.stub() };
    sinon.stub(db, 'getDB').resolves({ redis: mockRedis, pool: mockPool });

    const res = await server.executeOperation({
      query: 'mutation UpdateDriverStatus($id: ID!, $status: String!) { updateDriverStatus(id: $id, status: $status) { id status } }',
      variables: { id: '1', status: 'AVAILABLE' },
    });

    assert.strictEqual(res.body.singleResult.data.updateDriverStatus.status, 'AVAILABLE');
    assert(findByIdAndUpdateStub.calledOnce);
    assert(mockRedis.set.calledWith('driver:1:status', 'AVAILABLE'));
  });

  it('should assign a driver to a delivery', async () => {
    const mockDelivery = {
      id: 'd1',
      status: 'ASSIGNED',
      customer: { id: 'c1', name: 'John' },
      driver: { id: 'dr1', name: 'Bob' }
    };

    sinon.stub(Delivery, 'findByIdAndUpdate').returns({
      populate: sinon.stub().returns({
        populate: sinon.stub().resolves(mockDelivery)
      })
    });
    sinon.stub(Driver, 'findByIdAndUpdate').resolves({});

    const mockRedis = { set: sinon.stub().resolves() };
    sinon.stub(db, 'getDB').resolves({ redis: mockRedis });

    const res = await server.executeOperation({
      query: 'mutation AssignDriver($deliveryId: ID!, $driverId: ID!) { assignDriver(deliveryId: $deliveryId, driverId: $driverId) { id status } }',
      variables: { deliveryId: 'd1', driverId: 'dr1' },
    });

    assert.strictEqual(res.body.singleResult.data.assignDriver.status, 'ASSIGNED');
    assert(mockRedis.set.calledWith('driver:dr1:status', 'BUSY'));
  });
});
