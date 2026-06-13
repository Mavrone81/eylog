const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const mongoose = require('mongoose');

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
      const mockPool = { query: sinon.stub().resolves() };
      const mockRedis = { set: sinon.stub().resolves() };
      dbStub.resolves({ pool: mockPool, redis: mockRedis });

      const mockSession = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };
      sinon.stub(mongoose, 'startSession').resolves(mockSession);

      const mockDriver = {
        id: 'driver123',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };
      const findDriverStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      const mockDelivery = {
        id: 'delivery123',
        status: 'ASSIGNED',
        populate: sinon.stub().returnsThis(),
      };
      const updateDeliveryStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(mockDelivery)
        }),
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery123',
        driverId: 'driver123',
      });

      expect(result.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(mockSession.commitTransaction.calledOnce).to.be.true;
      expect(mockRedis.set.calledWith('driver:driver123:status', 'BUSY')).to.be.true;
    });

    it('should throw an error if driver is not available', async () => {
      dbStub.resolves({});
      const mockSession = {
        startTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };
      sinon.stub(mongoose, 'startSession').resolves(mockSession);

      const mockDriver = { id: 'driver123', status: 'BUSY' };
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery123',
          driverId: 'driver123',
        });
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(mockSession.abortTransaction.calledOnce).to.be.true;
      }
    });
  });

  describe('Mutation: updateDeliveryStatus', () => {
    it('should update delivery status and release driver if DELIVERED', async () => {
      const mockPool = { query: sinon.stub().resolves() };
      const mockRedis = { set: sinon.stub().resolves() };
      dbStub.resolves({ pool: mockPool, redis: mockRedis });

      const mockSession = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };
      sinon.stub(mongoose, 'startSession').resolves(mockSession);

      const mockDriver = {
        id: 'driver123',
        status: 'BUSY',
        save: sinon.stub().resolves(),
      };
      const mockDelivery = {
        id: 'delivery123',
        status: 'DELIVERED',
        driver: { id: 'driver123' },
      };

      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(mockDelivery)
        }),
      });
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      const result = await resolvers.Mutation.updateDeliveryStatus(null, {
        deliveryId: 'delivery123',
        status: 'DELIVERED',
      });

      expect(result.status).to.equal('DELIVERED');
      expect(mockDriver.status).to.equal('AVAILABLE');
      expect(mockRedis.set.calledWith('driver:driver123:status', 'AVAILABLE')).to.be.true;
    });
  });
});
