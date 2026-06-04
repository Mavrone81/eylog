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

  describe('Mutation.assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const mockDriver = {
        _id: 'driver123',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
      };
      const mockDelivery = {
        _id: 'delivery456',
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves({ _id: 'delivery456', status: 'ASSIGNED' }),
      };

      const session = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };

      const mongooseStub = {
        startSession: sinon.stub().resolves(session),
      };

      const redisStub = {
        set: sinon.stub().resolves(),
      };

      const pgStub = {
        query: sinon.stub().resolves(),
      };

      dbStub.resolves({ mongoose: mongooseStub, redis: redisStub, pg: pgStub });

      const findByIdStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      const findByIdAndUpdateStub = sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves({ _id: 'delivery456', status: 'ASSIGNED' }),
        }),
      });

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery456',
        driverId: 'driver123',
      });

      expect(result.status).to.equal('ASSIGNED');
      expect(session.commitTransaction.calledOnce).to.be.true;
      expect(redisStub.set.calledWith('driver:driver123:status', 'BUSY')).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
      const mockDriver = { _id: 'driver123', status: 'BUSY' };
      const session = {
        startTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub(),
      };

      dbStub.resolves({
        mongoose: { startSession: sinon.stub().resolves(session) },
        redis: {},
        pg: {}
      });

      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver),
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery456',
          driverId: 'driver123',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Driver not available');
        expect(session.abortTransaction.calledOnce).to.be.true;
      }
    });
  });

  describe('Delivery Resolvers', () => {
    it('should return populated customer if already present', async () => {
      const parent = { customer: { name: 'John Doe' } };
      const result = await resolvers.Delivery.customer(parent);
      expect(result.name).to.equal('John Doe');
    });

    it('should fetch customer if not populated', async () => {
      const parent = { customer: 'cust123' };
      const findByIdStub = sinon.stub(Customer, 'findById').resolves({ name: 'Jane Doe' });
      const result = await resolvers.Delivery.customer(parent);
      expect(result.name).to.equal('Jane Doe');
      expect(findByIdStub.calledWith('cust123')).to.be.true;
    });
  });
});
