const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Customer = require('./models/Customer');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const mongoose = require('mongoose');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves({ rows: [] }) },
      redisClient: { set: sinon.stub().resolves('OK') },
      mongoConn: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Query.deliveries', () => {
    it('should return all deliveries', async () => {
      const mockDeliveries = [{ id: '1', status: 'PENDING' }];
      const findStub = sinon.stub(Delivery, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            exec: sinon.stub().resolves(mockDeliveries)
          })
        })
      });

      const result = await resolvers.Query.deliveries();
      expect(result).to.equal(mockDeliveries);
      expect(findStub.calledOnce).to.be.true;
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };
      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      const mockDriver = { id: 'd1', status: 'AVAILABLE', save: sinon.stub().resolves() };
      const driverFindStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      const mockDelivery = { id: 'del1', status: 'ASSIGNED' };
      const deliveryUpdateStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(mockDelivery)
        })
      });

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'd1' });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('BUSY');
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };
      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      const mockDriver = { id: 'd1', status: 'BUSY' };
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      try {
        await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'd1' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(sessionStub.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
