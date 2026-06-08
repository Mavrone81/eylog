const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves({ rows: [] }) },
      redis: { set: sinon.stub().resolves('OK') },
      mongoose: {
        startSession: sinon.stub().resolves({
          startTransaction: sinon.stub(),
          commitTransaction: sinon.stub(),
          abortTransaction: sinon.stub(),
          endSession: sinon.stub(),
        }),
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Queries', () => {
    it('should fetch deliveries', async () => {
      const mockDeliveries = [{ id: '1' }];
      const execStub = sinon.stub().resolves(mockDeliveries);
      const populateStub = sinon.stub().returns({ exec: execStub });
      sinon.stub(Delivery, 'find').returns({
        populate: populateStub
      });

      const result = await resolvers.Query.deliveries();
      expect(result).to.be.an('array');
      expect(result[0].id).to.equal('1');
    });
  });

  describe('Mutations', () => {
    it('should assign a driver', async () => {
      const driverStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves({ id: 'd1', status: 'AVAILABLE', save: sinon.stub().resolves() }),
      });

      const deliveryStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().resolves({ id: 'del1', status: 'ASSIGNED' }),
      });

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'd1' });
      expect(result.status).to.equal('ASSIGNED');
    });

    it('should throw error if driver is not available', async () => {
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves({ id: 'd1', status: 'BUSY' }),
      });

      try {
        await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'd1' });
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
      }
    });
  });
});
