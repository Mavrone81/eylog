const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('assignDriver', () => {
    it('should assign a driver to a delivery and update status to BUSY', async () => {
      const mockSession = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };

      const mockRedis = {
        set: sinon.stub().resolves(),
      };

      const mockPool = {
        query: sinon.stub().resolves(),
      };

      const mockMongoose = {
        startSession: sinon.stub().resolves(mockSession),
      };

      dbStub.resolves({ redis: mockRedis, mongoose: mockMongoose, pool: mockPool });

      const mockDriver = {
        id: 'driver1',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };

      const mockDelivery = {
        id: 'delivery1',
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves({ id: 'delivery1', status: 'ASSIGNED' })
        })
      };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      sinon.stub(Delivery, 'findByIdAndUpdate').returns(mockDelivery);

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery1',
        driverId: 'driver1',
      });

      expect(result.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(mockRedis.set.calledWith('driver:driver1:status', 'BUSY')).to.be.true;
      expect(mockSession.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is already BUSY', async () => {
      const mockSession = {
        startTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };

      dbStub.resolves({ mongoose: { startSession: sinon.stub().resolves(mockSession) } });

      const mockDriver = {
        id: 'driver1',
        status: 'BUSY',
      };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery1',
          driverId: 'driver1',
        });
      } catch (error) {
        expect(error.message).to.equal('Driver is already busy');
        expect(mockSession.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
