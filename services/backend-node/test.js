const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Delivery = require('./models/Delivery');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const mongoose = require('mongoose');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves() },
      redis: { set: sinon.stub().resolves() },
      mongoose: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Query.deliveries', () => {
    it('should return all deliveries', async () => {
      const mockDeliveries = [{ id: '1', status: 'PENDING' }];
      const findStub = sinon.stub(Delivery, 'find').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDeliveries)
      });

      const result = await resolvers.Query.deliveries();
      expect(result).to.equal(mockDeliveries);
      expect(findStub.calledOnce).to.be.true;
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign a driver to a delivery', async () => {
      const session = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };
      sinon.stub(mongoose, 'startSession').resolves(session);

      const mockDriver = {
        id: 'driver1',
        status: 'AVAILABLE',
        save: sinon.stub().resolves()
      };
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDriver)
      });

      const mockDelivery = { id: 'delivery1', status: 'ASSIGNED' };
      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery1',
        driverId: 'driver1'
      });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('BUSY');
      expect(session.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const session = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };
      sinon.stub(mongoose, 'startSession').resolves(session);

      const mockDriver = { id: 'driver1', status: 'BUSY' };
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDriver)
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery1',
          driverId: 'driver1'
        });
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(session.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
