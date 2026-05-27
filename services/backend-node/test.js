const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const db = require('./db');
const axios = require('axios');

describe('GraphQL Resolvers', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('Query.drivers', () => {
    it('should return all drivers', async () => {
      const mockDrivers = [{ name: 'John Doe', email: 'john@example.com' }];
      sinon.stub(Driver, 'find').resolves(mockDrivers);

      const result = await resolvers.Query.drivers();
      expect(result).to.equal(mockDrivers);
    });
  });

  describe('Mutation.updateDriverStatus', () => {
    it('should update driver status in MongoDB and Redis', async () => {
      const mockDriver = {
        id: '123',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };
      sinon.stub(Driver, 'findById').resolves(mockDriver);

      const mockRedis = { set: sinon.stub().resolves() };
      sinon.stub(db, 'getDB').resolves({ redis: mockRedis });

      const result = await resolvers.Mutation.updateDriverStatus(null, { id: '123', status: 'BUSY' });

      expect(mockDriver.status).to.equal('BUSY');
      expect(mockRedis.set.calledWith('driver:123:status', 'BUSY')).to.be.true;
      expect(result).to.equal(mockDriver);
    });
  });

  describe('Query.optimizeRoute', () => {
    it('should call optimization service and return route', async () => {
      const locations = [{ lat: 10, lng: 20, address: 'Test' }];
      const mockResponse = {
        data: {
          optimized_route: locations,
          total_distance: 100.5,
        },
      };
      sinon.stub(axios, 'post').resolves(mockResponse);

      const result = await resolvers.Query.optimizeRoute(null, { locations });

      expect(result.optimizedLocations).to.deep.equal(locations);
      expect(result.totalDistance).to.equal(100.5);
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign a driver to a delivery', async () => {
      const mockDelivery = {
        id: 'del123',
        status: 'PENDING',
        save: sinon.stub().resolves(),
        populate: sinon.stub().returnsThis(),
      };
      const mockDriver = {
        id: 'drv123',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };

      sinon.stub(Delivery, 'findById').resolves(mockDelivery);
      sinon.stub(Driver, 'findById').resolves(mockDriver);

      const mockRedis = { set: sinon.stub().resolves() };
      sinon.stub(db, 'getDB').resolves({ redis: mockRedis });

      await resolvers.Mutation.assignDriver(null, { deliveryId: 'del123', driverId: 'drv123' });

      expect(mockDelivery.driverId).to.equal('drv123');
      expect(mockDelivery.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(mockRedis.set.calledWith('driver:drv123:status', 'BUSY')).to.be.true;
    });
  });
});
