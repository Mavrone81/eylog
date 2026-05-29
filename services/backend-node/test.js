const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Query.deliveries', () => {
    it('should return all deliveries with populated fields', async () => {
      const mockDeliveries = [{ id: '1', status: 'PENDING' }];
      const findStub = {
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves(mockDeliveries)
      };
      // For mongoose models that use thenable find()
      sinon.stub(Delivery, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(mockDeliveries)
        })
      });

      const result = await resolvers.Query.deliveries();
      expect(result).to.equal(mockDeliveries);
    });
  });

  describe('Mutation.createCustomer', () => {
    it('should create a new customer', async () => {
      const customerData = { name: 'John Doe', email: 'john@example.com' };
      sinon.stub(Customer, 'create').resolves(customerData);

      const result = await resolvers.Mutation.createCustomer(null, customerData);
      expect(result).to.equal(customerData);
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign a driver to a delivery and update status', async () => {
      const mockSession = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };
      const mockPool = { query: sinon.stub().resolves() };
      const mockRedis = { set: sinon.stub().resolves() };
      const mockMongoose = { startSession: sinon.stub().resolves(mockSession) };

      dbStub.resolves({ pool: mockPool, redis: mockRedis, mongoose: mockMongoose });

      const mockDriver = { id: 'driver1', status: 'BUSY' };
      const mockDelivery = { id: 'delivery1', driver: 'driver1', status: 'ASSIGNED' };

      sinon.stub(Driver, 'findByIdAndUpdate').resolves(mockDriver);
      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(mockDelivery)
        })
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery1',
        driverId: 'driver1'
      });

      expect(result).to.equal(mockDelivery);
      expect(mockRedis.set.calledWith('driver:driver1:status', 'BUSY')).to.be.true;
      expect(mockSession.commitTransaction.calledOnce).to.be.true;
    });
  });
});
