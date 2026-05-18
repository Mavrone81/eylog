const assert = require('assert');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

describe('GraphQL Resolvers', () => {
  let pgStub, redisStub;

  before(async () => {
    pgStub = { query: sinon.stub().resolves({ rows: [] }) };
    redisStub = { set: sinon.stub().resolves('OK'), connect: sinon.stub().resolves() };
    sinon.stub(mongoose, 'connect').resolves();
    sinon.stub(db, 'getDB').resolves({ pg: pgStub, redis: redisStub, mongoose });
  });

  after(() => {
    sinon.restore();
  });

  it('fetches deliveries', async () => {
    const findStub = sinon.stub(Delivery, 'find').resolves([
      { id: '1', status: 'PENDING' }
    ]);

    const result = await resolvers.Query.deliveries();
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].status, 'PENDING');

    findStub.restore();
  });

  it('updates driver status', async () => {
    const findByIdAndUpdateStub = sinon.stub(Driver, 'findByIdAndUpdate').resolves({
      id: 'driver1',
      status: 'AVAILABLE'
    });

    const result = await resolvers.Mutation.updateDriverStatus(null, { id: 'driver1', status: 'AVAILABLE' });

    assert.strictEqual(result.status, 'AVAILABLE');
    assert(redisStub.set.calledWith('driver:driver1:status', 'AVAILABLE'));

    findByIdAndUpdateStub.restore();
  });
});
