const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const db = require('./db');
const sms = require('./utils/sms');

describe('GraphQL Resolvers', () => {
  let dbStub;
  let smsStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').returns({
      pgPool: { query: sinon.stub().resolves() },
      redisClient: { set: sinon.stub().resolves() },
      mongooseConnection: {
        startSession: sinon.stub().returns({
          startTransaction: sinon.stub(),
          commitTransaction: sinon.stub(),
          abortTransaction: sinon.stub(),
          endSession: sinon.stub()
        })
      }
    });
    smsStub = sinon.stub(sms, 'sendSMS');
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
    it('should assign an available driver to a delivery', async () => {
      const driverId = 'driver123';
      const deliveryId = 'delivery456';
      const mockDriver = { _id: driverId, status: 'AVAILABLE', name: 'John Doe', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'ASSIGNED',
        customer: { phone: '1234567890' }
      };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });
      const findByIdAndUpdateStub = sinon.stub(Delivery, 'findByIdAndUpdate').callsFake(() => {
        const query = {};
        query.populate = sinon.stub().returns(query);
        query.session = sinon.stub().returns(query);
        query.exec = sinon.stub().resolves(mockDelivery);
        return query;
      });

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId, driverId });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('BUSY');
      expect(smsStub.calledOnce).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const driverId = 'driver123';
      const mockDriver = { _id: driverId, status: 'BUSY' };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      try {
        await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
      }
    });
  });

  describe('Mutation.updateDeliveryStatus', () => {
    it('should update status and release driver if DELIVERED', async () => {
      const deliveryId = 'del123';
      const driverId = 'drv123';
      const mockDriver = { _id: driverId, status: 'BUSY', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'DELIVERED',
        driver: { _id: driverId },
        customer: { phone: '1234567890' }
      };

      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'DELIVERED' });

      expect(result.status).to.equal('DELIVERED');
      expect(mockDriver.status).to.equal('AVAILABLE');
      expect(smsStub.calledOnce).to.be.true;
    });

    it('should release driver if status is CANCELLED', async () => {
      const deliveryId = 'del123';
      const driverId = 'drv123';
      const mockDriver = { _id: driverId, status: 'BUSY', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'CANCELLED',
        driver: { _id: driverId },
        customer: { phone: '1234567890' }
      };

      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'CANCELLED' });

      expect(result.status).to.equal('CANCELLED');
      expect(mockDriver.status).to.equal('AVAILABLE');
    });
  });

  describe('Mutation.updateDriverLocation', () => {
    it('should update driver location in MongoDB and Redis', async () => {
      const driverId = 'drv123';
      const location = { lat: 10.5, lng: 20.5, address: 'Test St' };
      const mockDriver = { id: driverId, current_location: location };

      sinon.stub(Driver, 'findByIdAndUpdate').returns({
        exec: sinon.stub().resolves(mockDriver)
      });

      const result = await resolvers.Mutation.updateDriverLocation(null, { id: driverId, location });

      expect(result).to.equal(mockDriver);
      const { redisClient } = db.getDB();
      expect(redisClient.set.calledWith(`driver:${driverId}:location`, JSON.stringify(location))).to.be.true;
    });
  });
});
