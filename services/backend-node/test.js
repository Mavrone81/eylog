const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const sms = require('./utils/sms');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const db = require('./db');

describe('GraphQL Resolvers', () => {
  let dbStub;
  let redisSetStub;
  let pgQueryStub;

  beforeEach(() => {
    redisSetStub = sinon.stub().resolves();
    pgQueryStub = sinon.stub().resolves();
    dbStub = sinon.stub(db, 'getDB').returns({
      pgPool: { query: pgQueryStub },
      redisClient: { set: redisSetStub },
      mongooseConnection: {
        startSession: sinon.stub().returns({
          startTransaction: sinon.stub(),
          commitTransaction: sinon.stub(),
          abortTransaction: sinon.stub(),
          endSession: sinon.stub()
        })
      }
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation.createDelivery', () => {
    it('should create a delivery and send SMS', async () => {
      const customerId = 'cust123';
      const origin = { lat: 10, lng: 20, address: 'Origin' };
      const destination = { lat: 30, lng: 40, address: 'Dest' };
      const mockCustomer = { id: customerId, phone: '1234567890' };

      const saveStub = sinon.stub(Delivery.prototype, 'save').resolves();
      const populateStub = sinon.stub(Delivery.prototype, 'populate').resolves();
      const smsStub = sinon.stub(sms, 'sendSMS');

      // We need to make sure the delivery instance has the customer phone after populate
      sinon.stub(Delivery.prototype, 'customer').value(mockCustomer);
      sinon.stub(Delivery.prototype, 'id').value('del123');

      const result = await resolvers.Mutation.createDelivery(null, { customerId, origin, destination });

      expect(smsStub.calledOnce).to.be.true;
      expect(smsStub.firstCall.args[0]).to.equal('1234567890');
      expect(pgQueryStub.calledOnce).to.be.true;
    });
  });

  describe('Mutation.updateDriverLocation', () => {
    it('should update driver location and cache in Redis', async () => {
      const driverId = 'driver123';
      const location = { lat: 10, lng: 20, address: 'New Location' };
      const mockDriver = { id: driverId, current_location: location };

      sinon.stub(Driver, 'findByIdAndUpdate').returns(mockDriver);

      const result = await resolvers.Mutation.updateDriverLocation(null, { id: driverId, location });

      expect(result).to.equal(mockDriver);
      expect(redisSetStub.calledOnce).to.be.true;
      expect(redisSetStub.firstCall.args[0]).to.equal(`driver:${driverId}:location`);
    });
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
      const mockDriver = { _id: driverId, name: 'John', status: 'AVAILABLE', save: sinon.stub().resolves() };
      const mockCustomer = { id: 'cust1', phone: '1234567890' };
      const mockDelivery = { id: deliveryId, status: 'ASSIGNED', customer: mockCustomer };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });
      sinon.stub(Delivery, 'findByIdAndUpdate').callsFake(() => {
        const query = {};
        query.populate = sinon.stub().returns(query);
        query.session = sinon.stub().returns(query);
        query.exec = sinon.stub().resolves(mockDelivery);
        return query;
      });
      const smsStub = sinon.stub(sms, 'sendSMS');

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId, driverId });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('BUSY');
      expect(smsStub.calledOnce).to.be.true;
      expect(redisSetStub.calledWith(`driver:${driverId}:status`, 'BUSY')).to.be.true;
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
    it('should update status and release driver if delivered', async () => {
      const deliveryId = 'del123';
      const driverId = 'driver456';
      const mockDriver = { _id: driverId, status: 'BUSY', save: sinon.stub().resolves() };
      const mockCustomer = { id: 'cust1', phone: '1234567890' };
      const mockDelivery = { id: deliveryId, status: 'DELIVERED', driver: { _id: driverId }, customer: mockCustomer };

      sinon.stub(Delivery, 'findByIdAndUpdate').callsFake(() => {
        const query = {};
        query.populate = sinon.stub().returns(query);
        query.session = sinon.stub().returns(query);
        query.exec = sinon.stub().resolves(mockDelivery);
        return query;
      });
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });
      const smsStub = sinon.stub(sms, 'sendSMS');

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'DELIVERED' });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('AVAILABLE');
      expect(smsStub.calledOnce).to.be.true;
      expect(redisSetStub.calledWith(`driver:${driverId}:status`, 'AVAILABLE')).to.be.true;
    });
  });
});
