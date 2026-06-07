const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const mockDriver = {
        id: 'driver-1',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };
      const mockDelivery = {
        id: 'delivery-1',
        status: 'PENDING',
        save: sinon.stub().resolves(),
        populate: sinon.stub().resolves({ id: 'delivery-1', status: 'ASSIGNED' }),
      };

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

      dbStub.resolves({
        redisClient: mockRedis,
        mongoose: mockMongoose,
        pool: mockPool,
      });

      const driverFindStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });
      const deliveryFindStub = sinon.stub(Delivery, 'findById').returns({
        session: sinon.stub().resolves(mockDelivery),
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery-1',
        driverId: 'driver-1',
      });

      expect(result.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(mockSession.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw an error if driver is not available', async () => {
      const mockDriver = {
        id: 'driver-1',
        status: 'BUSY',
      };

      const mockSession = {
        startTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };

      const mockMongoose = {
        startSession: sinon.stub().resolves(mockSession),
      };

      dbStub.resolves({
        mongoose: mockMongoose,
      });

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery-1',
          driverId: 'driver-1',
        });
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(mockSession.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
