const { expect } = require('chai');
const sinon = require('sinon');
const db = require('./db');
const sms = require('./utils/sms');

// Stub before requiring index.js to handle the side effects if any
let pgPoolStub = { query: sinon.stub().resolves() };
let redisClientStub = { set: sinon.stub().resolves() };
let mongooseConnectionStub = {
  startSession: sinon.stub().returns({
    startTransaction: sinon.stub(),
    commitTransaction: sinon.stub(),
    abortTransaction: sinon.stub(),
    endSession: sinon.stub().resolves()
  })
};

sinon.stub(db, 'getDB').returns({
  pgPool: pgPoolStub,
  redisClient: redisClientStub,
  mongooseConnection: mongooseConnectionStub
});

const sendSMSStub = sinon.stub(sms, 'sendSMS');

const { resolvers } = require('./index');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

describe('GraphQL Resolvers', () => {

  afterEach(() => {
    sinon.resetHistory();
    // We don't restore here because we need the stubs to stay active across requires or for the whole suite
  });

  after(() => {
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
      findStub.restore();
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign an available driver to a delivery and send SMS', async () => {
      const driverId = 'driver123';
      const deliveryId = 'delivery456';
      const mockDriver = { _id: driverId, name: 'John Doe', status: 'AVAILABLE', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'ASSIGNED',
        customer: { phone: '1234567890' },
        driver: mockDriver
      };

      const findDriverStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });
      const findDeliveryStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId, driverId });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('BUSY');
      expect(sendSMSStub.calledWith('1234567890', sinon.match(/John Doe/))).to.be.true;

      findDriverStub.restore();
      findDeliveryStub.restore();
    });

    it('should throw error if driver is not available', async () => {
      const driverId = 'driver123';
      const mockDriver = { _id: driverId, status: 'BUSY' };

      const findDriverStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      try {
        await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
      }
      findDriverStub.restore();
    });
  });

  describe('Mutation.updateDriverLocation', () => {
    it('should update driver location and cache in redis', async () => {
      const driverId = 'driver123';
      const location = { lat: 1.23, lng: 4.56, address: 'Test St' };
      const mockDriver = { _id: driverId, current_location: location };

      const findDriverStub = sinon.stub(Driver, 'findByIdAndUpdate').returns({
        exec: sinon.stub().resolves(mockDriver)
      });

      const result = await resolvers.Mutation.updateDriverLocation(null, { id: driverId, location });

      expect(result).to.equal(mockDriver);
      expect(redisClientStub.set.calledWith(`driver:${driverId}:location`, JSON.stringify(location))).to.be.true;
      findDriverStub.restore();
    });
  });

  describe('Mutation.updateDeliveryStatus', () => {
    it('should update status and send SMS', async () => {
      const deliveryId = 'del123';
      const mockDelivery = {
        id: deliveryId,
        status: 'IN_TRANSIT',
        customer: { phone: '1234567890' },
        driver: { _id: 'd1' }
      };

      const findDeliveryStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'IN_TRANSIT' });

      expect(result).to.equal(mockDelivery);
      expect(sendSMSStub.calledWith('1234567890', sinon.match(/IN_TRANSIT/))).to.be.true;
      findDeliveryStub.restore();
    });

    it('should release driver when delivered', async () => {
      const deliveryId = 'del123';
      const driverId = 'd123';
      const mockDriver = { _id: driverId, status: 'BUSY', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'DELIVERED',
        customer: { phone: '1234567890' },
        driver: { _id: driverId }
      };

      const findDeliveryStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDelivery)
      });
      const findDriverStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });

      await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'DELIVERED' });

      expect(mockDriver.status).to.equal('AVAILABLE');
      expect(redisClientStub.set.calledWith(`driver:${driverId}:status`, 'AVAILABLE')).to.be.true;
      findDeliveryStub.restore();
      findDriverStub.restore();
    });
  });
});
