const assert = require('assert');
const sinon = require('sinon');
const { resolvers } = require('./index');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const db = require('./db');
const axios = require('axios');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves({ rows: [] }) },
      redis: { set: sinon.stub().resolves() },
      mongoose: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Query.drivers', () => {
    it('should return all drivers', async () => {
      const drivers = [{ name: 'John Doe' }];
      const findStub = sinon.stub(Driver, 'find').resolves(drivers);

      const result = await resolvers.Query.drivers();

      assert.strictEqual(result, drivers);
      assert(findStub.calledOnce);
    });
  });

  describe('Query.optimizeRoute', () => {
    it('should call optimization service', async () => {
      process.env.OPTIMIZATION_SERVICE_URL = 'http://opt:5000/optimize';
      const axiosStub = sinon.stub(axios, 'post').resolves({
        data: {
          optimized_route: [{ lat: 1, lng: 2 }],
          total_distance: 10.5
        }
      });

      const locations = [{ lat: 1, lng: 2 }];
      const result = await resolvers.Query.optimizeRoute(null, { locations });

      assert.deepStrictEqual(result.locations, locations);
      assert.strictEqual(result.totalDistance, 10.5);
      assert(axiosStub.calledOnce);
    });
  });

  describe('Mutation.createDelivery', () => {
    it('should create a delivery and log event', async () => {
      const saveStub = sinon.stub(Delivery.prototype, 'save').resolves();
      const populateStub = sinon.stub(Delivery.prototype, 'populate').resolves({ id: '123' });

      const result = await resolvers.Mutation.createDelivery(null, {
        customerId: 'cust1',
        origin: { lat: 0, lng: 0 },
        destination: { lat: 1, lng: 1 }
      });

      assert.strictEqual(result.id, '123');
      assert(saveStub.calledOnce);
    });
  });
});
