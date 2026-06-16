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
      const mockDriver = { _id: driverId, status: 'AVAILABLE', save: sinon.stub().resolves() };
      const mockDelivery = { id: deliveryId, status: 'ASSIGNED' };

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

    it('should throw error if delivery is not found', async () => {
      const driverId = 'driver123';
      const mockDriver = { _id: driverId, status: 'AVAILABLE', save: sinon.stub().resolves() };

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });
      sinon.stub(Delivery, 'findByIdAndUpdate').callsFake(() => {
        const query = {};
        query.populate = sinon.stub().returns(query);
        query.session = sinon.stub().returns(query);
        query.exec = sinon.stub().resolves(null);
        return query;
      });

      try {
        await resolvers.Mutation.assignDriver(null, { deliveryId: 'nonexistent', driverId });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Delivery not found');
      }
    });
  });

  describe('Mutation.updateDeliveryStatus', () => {
    it('should update delivery status and release driver if DELIVERED', async () => {
      const deliveryId = 'del123';
      const driverId = 'drv456';
      const mockDriver = { _id: driverId, status: 'BUSY', save: sinon.stub().resolves() };
      const mockDelivery = { id: deliveryId, status: 'DELIVERED', driver: { _id: driverId } };

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

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'DELIVERED' });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('AVAILABLE');
    });

    it('should update delivery status and release driver if CANCELLED', async () => {
      const deliveryId = 'del123';
      const driverId = 'drv456';
      const mockDriver = { _id: driverId, status: 'BUSY', save: sinon.stub().resolves() };
      const mockDelivery = { id: deliveryId, status: 'CANCELLED', driver: { _id: driverId } };

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

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { id: deliveryId, status: 'CANCELLED' });

      expect(result).to.equal(mockDelivery);
      expect(mockDriver.status).to.equal('AVAILABLE');
    });

    it('should throw error if delivery not found', async () => {
      sinon.stub(Delivery, 'findByIdAndUpdate').callsFake(() => {
        const query = {};
        query.populate = sinon.stub().returns(query);
        query.session = sinon.stub().returns(query);
        query.exec = sinon.stub().resolves(null);
        return query;
      });

      try {
        await resolvers.Mutation.updateDeliveryStatus(null, { id: 'nonexistent', status: 'DELIVERED' });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Delivery not found');
      }
    });
  });

  describe('Mutation.updateDriverLocation', () => {
    it('should update driver location', async () => {
      const driverId = 'drv123';
      const newLocation = { lat: 10, lng: 20, address: 'New Location' };
      const mockDriver = { id: driverId, current_location: newLocation };

      const findByIdAndUpdateStub = sinon.stub(Driver, 'findByIdAndUpdate').returns({
        exec: sinon.stub().resolves(mockDriver)
      });

      const result = await resolvers.Mutation.updateDriverLocation(null, { id: driverId, location: newLocation });

      expect(result).to.equal(mockDriver);
      expect(findByIdAndUpdateStub.calledWith(driverId, { current_location: newLocation }, { new: true })).to.be.true;
    });

    it('should throw error if driver not found', async () => {
      sinon.stub(Driver, 'findByIdAndUpdate').returns({
        exec: sinon.stub().resolves(null)
      });

      try {
        await resolvers.Mutation.updateDriverLocation(null, { id: 'nonexistent', location: {} });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Driver not found');
      }
    });
  });

  describe('Mutation.createDelivery', () => {
    it('should create a new delivery', async () => {
      const customerId = 'cust123';
      const origin = { lat: 1, lng: 2, address: 'Origin' };
      const destination = { lat: 3, lng: 4, address: 'Dest' };
      const mockDelivery = { id: 'del123', customer: customerId, origin, destination, status: 'PENDING' };

      const saveStub = sinon.stub(Delivery.prototype, 'save').resolves();
      const populateStub = sinon.stub(Delivery.prototype, 'populate').resolves(mockDelivery);

      const result = await resolvers.Mutation.createDelivery(null, { customerId, origin, destination });

      expect(result).to.equal(mockDelivery);
      expect(saveStub.calledOnce).to.be.true;
    });

    it('should throw error for invalid coordinates', async () => {
      try {
        await resolvers.Mutation.createDelivery(null, { customerId: 'c1', origin: { lat: 1 }, destination: { lat: 3, lng: 4 } });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Invalid coordinates');
      }
    });
  });
});
