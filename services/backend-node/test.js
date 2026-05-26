const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      redis: { set: sinon.stub().resolves('OK') },
      mongo: {},
      pool: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: updateDriverStatus', () => {
    it('should update driver status and update redis', async () => {
      const mockDriver = { id: '1', name: 'John Doe', status: 'AVAILABLE' };
      const findByIdAndUpdateStub = sinon.stub(Driver, 'findByIdAndUpdate').resolves(mockDriver);

      const result = await resolvers.Mutation.updateDriverStatus(null, { id: '1', status: 'AVAILABLE' });

      expect(result).to.deep.equal(mockDriver);
      expect(findByIdAndUpdateStub.calledOnce).to.be.true;
      const { redis } = await db.getDB();
      expect(redis.set.calledWith('driver:1:status', 'AVAILABLE')).to.be.true;
    });
  });

  describe('Mutation: assignDriver', () => {
    it('should assign driver to delivery and update status in redis', async () => {
      const mockDelivery = {
        id: 'del1',
        status: 'ASSIGNED',
        populate: function() { return this; }
      };
      const deliveryStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(mockDelivery)
        })
      });
      const driverStub = sinon.stub(Driver, 'findByIdAndUpdate').resolves({ id: 'drv1' });

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'drv1' });

      expect(result).to.deep.equal(mockDelivery);
      expect(deliveryStub.calledOnce).to.be.true;
      expect(driverStub.calledOnce).to.be.true;
      const { redis } = await db.getDB();
      expect(redis.set.calledWith('driver:drv1:status', 'BUSY')).to.be.true;
    });
  });
});
