const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const db = require('./db');

describe('GraphQL Resolvers', () => {
  let dbStub;

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
      const mockDriver = { _id: driverId, name: 'John Doe', status: 'AVAILABLE', save: sinon.stub().resolves() };
      const mockDelivery = {
        id: deliveryId,
        status: 'ASSIGNED',
        customer: { email: 'test@example.com', phone: '1234567890' },
        driver: mockDriver
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

  describe('Mutation.updateDriverLocation', () => {
    it('should update driver location and cache in redis', async () => {
      const driverId = 'driver123';
      const newLocation = { lat: 40.7128, lng: -74.0060, address: 'New York' };
      const mockDriver = { id: driverId, current_location: newLocation };

      const findByIdAndUpdateStub = sinon.stub(Driver, 'findByIdAndUpdate').resolves(mockDriver);

      const result = await resolvers.Mutation.updateDriverLocation(null, { id: driverId, location: newLocation });

      expect(result).to.equal(mockDriver);
      expect(findByIdAndUpdateStub.calledWith(driverId, { current_location: newLocation }, { new: true })).to.be.true;
      const { redisClient } = db.getDB();
      expect(redisClient.set.calledWith(`driver:${driverId}:location`, JSON.stringify(newLocation))).to.be.true;
    });
  });
});
