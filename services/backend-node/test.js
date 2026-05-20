const assert = require('assert');
const sinon = require('sinon');
const request = require('supertest');
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const axios = require('axios');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  let server;
  let url;
  let getDBStub;

  before(async () => {
    // Stub DB connections globally before starting server
    getDBStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves({ rows: [] }) },
      redisClient: {
        set: sinon.stub().resolves('OK'),
        connect: sinon.stub().resolves(),
        on: sinon.stub()
      },
      mongoose: { connect: sinon.stub().resolves() }
    });

    server = new ApolloServer({ typeDefs, resolvers });
    ({ url } = await startStandaloneServer(server, { listen: { port: 0 } }));
  });

  after(async () => {
    await server.stop();
    getDBStub.restore();
    sinon.restore();
  });

  describe('Queries', () => {
    it('should fetch all deliveries', async () => {
      const findStub = sinon.stub(Delivery, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves([{ id: '1', status: 'PENDING' }])
        })
      });

      const query = {
        query: `query { deliveries { id status } }`
      };

      const response = await request(url).post('/').send(query);
      if (response.body.errors) {
        console.error(JSON.stringify(response.body.errors, null, 2));
      }
      assert.strictEqual(response.body.data.deliveries[0].status, 'PENDING');
      findStub.restore();
    });

    it('should call optimization service', async () => {
      const axiosStub = sinon.stub(axios, 'post').resolves({
        data: {
          optimized_route: [{ lat: 10, lng: 20, address: 'Test' }],
          total_distance: 5.5
        }
      });

      const query = {
        query: `query { optimizeRoute(locations: [{lat: 10, lng: 20, address: "Test"}]) { total_distance } }`
      };

      const response = await request(url).post('/').send(query);
      assert.strictEqual(response.body.data.optimizeRoute.total_distance, 5.5);
      axiosStub.restore();
    });
  });

  describe('Mutations', () => {
    it('should assign a driver to a delivery', async () => {
      const deliveryInstance = {
        id: 'd1',
        status: 'ASSIGNED',
        populate: sinon.stub().returnsThis()
      };
      // We need to handle the chain: Delivery.findByIdAndUpdate(...).populate(...).populate(...)
      const updateDeliveryStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves(deliveryInstance)
        })
      });

      const updateDriverStub = sinon.stub(Driver, 'findByIdAndUpdate').resolves({ id: 'dr1', status: 'BUSY' });

      const mutation = {
        query: `mutation { assignDriver(deliveryId: "d1", driverId: "dr1") { id status } }`
      };

      const response = await request(url).post('/').send(mutation);
      if (response.body.errors) {
        console.error(JSON.stringify(response.body.errors, null, 2));
      }
      assert.ok(response.body.data.assignDriver);
      assert.strictEqual(response.body.data.assignDriver.status, 'ASSIGNED');

      updateDeliveryStub.restore();
      updateDriverStub.restore();
    });
  });
});
