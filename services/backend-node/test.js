const sinon = require('sinon');
const { expect } = require('chai');
const db = require('./db');
const { resolvers } = require('./index');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers Unit Tests', () => {
  let getDBStub;

  beforeEach(() => {
    getDBStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves({ rows: [] }) },
      redisClient: { set: sinon.stub().resolves('OK'), get: sinon.stub().resolves(null) },
      mongoose: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('drivers resolver returns drivers', async () => {
    const driversData = [{ id: '1', name: 'John Doe', email: 'john@example.com', status: 'AVAILABLE' }];
    const findStub = sinon.stub(Driver, 'find').resolves(driversData);

    const result = await resolvers.Query.drivers();
    expect(result).to.equal(driversData);
    expect(findStub.calledOnce).to.be.true;
  });

  it('updateDriverStatus mutation updates driver and redis', async () => {
    const driverData = { id: '1', name: 'John Doe', status: 'BUSY' };
    const findByIdAndUpdateStub = sinon.stub(Driver, 'findByIdAndUpdate').resolves(driverData);

    const result = await resolvers.Mutation.updateDriverStatus(null, { id: '1', status: 'BUSY' });

    expect(result).to.equal(driverData);
    expect(findByIdAndUpdateStub.calledOnce).to.be.true;

    const { redisClient } = await db.getDB();
    expect(redisClient.set.calledWith('driver:1:status', 'BUSY')).to.be.true;
  });
});
