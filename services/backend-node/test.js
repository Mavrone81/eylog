const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let getDBStub;
  let driverStub;
  let deliveryStub;
  let poolStub;
  let redisStub;
  let sessionStub;

  beforeEach(() => {
    poolStub = { query: sinon.stub().resolves() };
    redisStub = { set: sinon.stub().resolves(), get: sinon.stub().resolves() };
    sessionStub = {
      startTransaction: sinon.stub(),
      commitTransaction: sinon.stub(),
      abortTransaction: sinon.stub(),
      endSession: sinon.stub(),
    };

    getDBStub = sinon.stub(db, 'getDB').resolves({
      mongoose: { startSession: sinon.stub().resolves(sessionStub) },
      pool: poolStub,
      redis: redisStub,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const mockDriver = {
        _id: 'driver123',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };
      const mockDelivery = {
        _id: 'delivery456',
        status: 'ASSIGNED',
        driver: 'driver123',
        populate: sinon.stub().returnsThis(),
      };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(mockDelivery),
        }),
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery456',
        driverId: 'driver123',
      });

      expect(result.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const mockDriver = { _id: 'driver123', status: 'BUSY' };
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery456',
          driverId: 'driver123',
        });
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(sessionStub.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
