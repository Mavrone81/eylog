const chai = require('chai');
const expect = chai.expect;
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

  describe('assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const mockSession = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };

      const mockRedis = {
        set: sinon.stub().resolves(),
      };

      const mockPool = {
        query: sinon.stub().resolves(),
      };

      const mockMongoose = {
        startSession: sinon.stub().resolves(mockSession),
      };

      dbStub.resolves({
        pool: mockPool,
        redisClient: mockRedis,
        mongoose: mockMongoose,
      });

      const mockDriver = {
        id: 'driver1',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };

      const mockDelivery = {
        id: 'delivery1',
        customer: 'cust1',
        driver: 'driver1',
        status: 'ASSIGNED',
      };

      const driverFindByIdStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returns({
          exec: sinon.stub().resolves(mockDriver),
        }),
      });

      const deliveryFindByIdAndUpdateStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            exec: sinon.stub().resolves(mockDelivery),
          }),
        }),
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery1',
        driverId: 'driver1',
      });

      expect(result).to.deep.equal(mockDelivery);
      expect(mockSession.startTransaction.calledOnce).to.be.true;
      expect(mockSession.commitTransaction.calledOnce).to.be.true;
      expect(mockRedis.set.calledWith('driver:driver1:status', 'BUSY')).to.be.true;
    });

    it('should throw an error if driver is not available', async () => {
      const mockSession = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };

      const mockMongoose = {
        startSession: sinon.stub().resolves(mockSession),
      };

      dbStub.resolves({
        mongoose: mockMongoose,
      });

      const mockDriver = {
        id: 'driver1',
        status: 'BUSY',
      };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returns({
          exec: sinon.stub().resolves(mockDriver),
        }),
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery1',
          driverId: 'driver1',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Driver is not available');
        expect(mockSession.abortTransaction.calledOnce).to.be.true;
      }
    });
  });

  describe('Queries', () => {
    it('should fetch all deliveries', async () => {
      const mockDeliveries = [{ id: '1' }, { id: '2' }];
      sinon.stub(Delivery, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            exec: sinon.stub().resolves(mockDeliveries),
          }),
        }),
      });

      const result = await resolvers.Query.deliveries();
      expect(result).to.deep.equal(mockDeliveries);
    });
  });
});
