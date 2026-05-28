const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let dbStub;
  let mockSession;

  beforeEach(() => {
    mockSession = {
      startTransaction: sinon.stub(),
      commitTransaction: sinon.stub(),
      abortTransaction: sinon.stub(),
      endSession: sinon.stub(),
    };

    dbStub = sinon.stub(db, 'getDB').resolves({
      redis: {
        set: sinon.stub().resolves('OK'),
        get: sinon.stub().resolves(null),
      },
      pool: {
        query: sinon.stub().resolves({ rows: [] }),
      },
      mongoose: {
        startSession: sinon.stub().resolves(mockSession),
      }
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: updateDriverStatus', () => {
    it('should update driver status in Mongo and Redis', async () => {
      const mockDriver = {
        id: 'driver123',
        status: 'IDLE',
        save: sinon.stub().resolves(),
      };
      const findByIdStub = sinon.stub(Driver, 'findById').resolves(mockDriver);

      const result = await resolvers.Mutation.updateDriverStatus(null, {
        id: 'driver123',
        status: 'BUSY',
      });

      expect(mockDriver.status).to.equal('BUSY');
      expect(result.status).to.equal('BUSY');
      expect(findByIdStub.calledOnceWith('driver123')).to.be.true;
    });

    it('should throw error if driver not found', async () => {
      sinon.stub(Driver, 'findById').resolves(null);

      try {
        await resolvers.Mutation.updateDriverStatus(null, {
          id: 'invalid',
          status: 'BUSY',
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Driver not found');
      }
    });
  });

  describe('Mutation: assignDriver', () => {
    it('should assign driver to delivery and update status with transaction', async () => {
      const mockDriver = {
        id: 'driver123',
        status: 'IDLE',
        save: sinon.stub().resolves(),
      };
      const mockDelivery = {
        id: 'delivery123',
        status: 'ASSIGNED',
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves({ id: 'delivery123', status: 'ASSIGNED' })
        })
      };

      const driverFindByIdStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().resolves(mockDriver)
      });
      sinon.stub(Delivery, 'findByIdAndUpdate').returns(mockDelivery);

      const result = await resolvers.Mutation.assignDriver(null, {
        deliveryId: 'delivery123',
        driverId: 'driver123',
      });

      expect(mockDriver.status).to.equal('BUSY');
      expect(result.status).to.equal('ASSIGNED');
      expect(mockSession.commitTransaction.calledOnce).to.be.true;
    });

    it('should abort transaction on error', async () => {
      sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().rejects(new Error('Test Error'))
      });

      try {
        await resolvers.Mutation.assignDriver(null, {
          deliveryId: 'delivery123',
          driverId: 'driver123',
        });
      } catch (error) {
        expect(error.message).to.equal('Test Error');
        expect(mockSession.abortTransaction.calledOnce).to.be.true;
      }
    });
  });
});
