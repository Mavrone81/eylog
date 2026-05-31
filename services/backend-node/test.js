const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let dbStub;
  let sessionStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB');
    const mockSession = {
      startTransaction: sinon.stub(),
      commitTransaction: sinon.stub(),
      abortTransaction: sinon.stub(),
      endSession: sinon.stub(),
    };
    sessionStub = sinon.stub(mongoose, 'startSession').resolves(mockSession);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: assignDriver', () => {
    it('should assign a driver to a delivery', async () => {
      const mockPg = { query: sinon.stub().resolves() };
      const mockRedis = { set: sinon.stub().resolves() };
      dbStub.resolves({ pg: mockPg, redis: mockRedis });

      const mockDriver = {
        _id: 'driver1',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };
      const mockDelivery = {
        _id: 'delivery1',
        status: 'PENDING',
        save: sinon.stub().resolves(),
        populate: sinon.stub().returns({
          _id: 'delivery1',
          status: 'ASSIGNED',
          driver: mockDriver,
          customer: { name: 'Customer A' },
        }),
      };

      const driverFindStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returns(mockDriver),
      });
      const deliveryFindStub = sinon.stub(Delivery, 'findById').returns({
        session: sinon.stub().returns(mockDelivery),
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery1',
        driverId: 'driver1',
      });

      expect(result.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(mockRedis.set.calledWith('driver:driver1:status', 'BUSY')).to.be.true;
    });

    it('should throw error if driver is BUSY', async () => {
      const mockPg = { query: sinon.stub().resolves() };
      const mockRedis = { set: sinon.stub().resolves() };
      dbStub.resolves({ pg: mockPg, redis: mockRedis });

      const mockDriver = {
        _id: 'driver1',
        status: 'BUSY',
      };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returns(mockDriver),
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery1',
          driverId: 'driver1',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Driver is already BUSY');
      }
    });
  });
});
