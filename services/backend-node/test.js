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

  describe('Query.drivers', () => {
    it('should return all drivers', async () => {
      const mockDrivers = [{ name: 'Driver 1' }, { name: 'Driver 2' }];
      const findStub = sinon.stub(Driver, 'find').resolves(mockDrivers);

      const result = await resolvers.Query.drivers();

      expect(result).to.equal(mockDrivers);
      expect(findStub.calledOnce).to.be.true;
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const mockDriver = { _id: 'd1', name: 'Driver 1', status: 'AVAILABLE', save: sinon.stub().resolves() };
      const mockDelivery = { _id: 'del1', status: 'PENDING', populate: sinon.stub().resolves({ _id: 'del1', status: 'ASSIGNED' }) };

      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };

      dbStub.resolves({
        mongoose: { startSession: sinon.stub().resolves(sessionStub) },
        redis: { set: sinon.stub().resolves() },
        pool: { query: sinon.stub().resolves() }
      });

      const findByIdStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });
      const findByIdAndUpdateStub = sinon.stub(Delivery, 'findByIdAndUpdate').resolves(mockDelivery);

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'd1' });

      expect(result.status).to.equal('ASSIGNED');
      expect(mockDriver.status).to.equal('BUSY');
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is not AVAILABLE', async () => {
        const mockDriver = { _id: 'd1', name: 'Driver 1', status: 'BUSY' };

        const sessionStub = {
          startTransaction: sinon.stub(),
          commitTransaction: sinon.stub(),
          abortTransaction: sinon.stub(),
          endSession: sinon.stub()
        };

        dbStub.resolves({
          mongoose: { startSession: sinon.stub().resolves(sessionStub) },
          redis: { set: sinon.stub().resolves() },
          pool: { query: sinon.stub().resolves() }
        });

        sinon.stub(Driver, 'findById').returns({
          session: sinon.stub().resolves(mockDriver)
        });

        try {
          await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'd1' });
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).to.equal('Driver not available');
          expect(sessionStub.abortTransaction.calledOnce).to.be.true;
        }
      });
  });
});
