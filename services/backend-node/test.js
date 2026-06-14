const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').returns({
      pool: { query: sinon.stub().resolves() },
      redisClient: { set: sinon.stub().resolves() },
      mongoConnection: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const mockDriver = {
        id: 'driver1',
        status: 'AVAILABLE',
        save: sinon.stub().resolves()
      };

      const mockDelivery = {
        id: 'delivery1',
        status: 'ASSIGNED'
      };

      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };

      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      // Mocking chained populate().populate().exec()
      const mockQuery = {
        populate: function() { return this; },
        exec: sinon.stub().resolves(mockDelivery)
      };
      sinon.stub(Delivery, 'findByIdAndUpdate').returns(mockQuery);

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery1',
        driverId: 'driver1'
      });

      expect(result.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const mockDriver = {
        id: 'driver1',
        status: 'BUSY'
      };

      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };

      sinon.stub(mongoose, 'startSession').resolves(sessionStub);
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery1',
          driverId: 'driver1'
        });
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(sessionStub.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
