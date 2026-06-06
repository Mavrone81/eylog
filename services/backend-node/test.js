const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const mongoose = require('mongoose');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      pg: { query: sinon.stub().resolves() },
      redis: { set: sinon.stub().resolves() },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: assignDriver', () => {
    it('should assign a driver to a delivery successfully', async () => {
      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };
      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      const mockDriver = {
        id: 'driver123',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };
      const driverStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returns(mockDriver),
      });

      const mockDelivery = {
        id: 'delivery123',
        status: 'PENDING',
        save: sinon.stub().resolves(),
        populate: sinon.stub().returnsThis(),
      };
      const deliveryStub = sinon.stub(Delivery, 'findById').returns({
        session: sinon.stub().returns(mockDelivery),
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery123',
        driverId: 'driver123',
      });

      expect(mockDriver.status).to.equal('BUSY');
      expect(mockDelivery.status).to.equal('ASSIGNED');
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };
      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      const mockDriver = {
        id: 'driver123',
        status: 'BUSY',
      };
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returns(mockDriver),
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery123',
          driverId: 'driver123',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(sessionStub.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
