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

  describe('Mutation.createDelivery', () => {
    it('should create a delivery and send SMS', async () => {
      const customerId = 'cust123';
      const origin = { lat: 10, lng: 20, address: 'Origin' };
      const destination = { lat: 30, lng: 40, address: 'Dest' };
      const mockCustomer = { id: customerId, phone: '1234567890' };

      const saveStub = sinon.stub(Delivery.prototype, 'save').resolves();
      const populateStub = sinon.stub(Delivery.prototype, 'populate').resolves({
        id: 'del123',
        customer: mockCustomer
      });

      const result = await resolvers.Mutation.createDelivery(null, { customerId, origin, destination });

      expect(result.id).to.equal('del123');
      expect(smsStub.calledWith('1234567890', sinon.match(/has been created/))).to.be.true;
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const driverId = 'driver123';
      const deliveryId = 'delivery456';
      const mockDriver = { _id: driverId, name: 'John', status: 'AVAILABLE', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'ASSIGNED',
        customer: { phone: '1234567890' },
        driver: mockDriver
      };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDriver)
      });

      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId, driverId });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('BUSY');
      expect(smsStub.calledWith('1234567890', sinon.match(/has been assigned/))).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const driverId = 'driver123';
      const mockDriver = { _id: driverId, status: 'BUSY' };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDriver)
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
    it('should update delivery status and release driver if delivered', async () => {
      const deliveryId = 'del123';
      const driverId = 'driver456';
      const mockDriver = { _id: driverId, status: 'BUSY', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'DELIVERED',
        customer: { phone: '1234567890' },
        driver: mockDriver
      };

      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDriver)
      });

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'DELIVERED' });

      expect(result.status).to.equal('DELIVERED');
      expect(mockDriver.status).to.equal('AVAILABLE');
      expect(smsStub.calledWith('1234567890', sinon.match(/updated to DELIVERED/))).to.be.true;
    });
  });

  describe('Mutation.updateDriverLocation', () => {
    it('should update driver location and cache in redis', async () => {
      const driverId = 'driver123';
      const location = { lat: 12.34, lng: 56.78, address: 'New Location' };
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
