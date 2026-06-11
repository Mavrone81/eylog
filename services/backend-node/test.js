const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves() },
      redis: { set: sinon.stub().resolves() }
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: assignDriver', () => {
    it('should assign an available driver to a delivery', async () => {
      const driverId = new mongoose.Types.ObjectId().toString();
      const deliveryId = new mongoose.Types.ObjectId().toString();

      const mockDriver = {
        _id: driverId,
        status: 'AVAILABLE',
        save: sinon.stub().resolves()
      };

      const mockDelivery = {
        _id: deliveryId,
        status: 'PENDING',
        save: sinon.stub().resolves()
      };

      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };

      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      const driverFindStub = sinon.stub(Driver, 'findById').returns({
        session: sinon.stub().returns({
          exec: sinon.stub().resolves(mockDriver)
        })
      });

      const deliveryFindStub = sinon.stub(Delivery, 'findById');
      deliveryFindStub.onCall(0).returns({
        session: sinon.stub().returns({
          exec: sinon.stub().resolves(mockDelivery)
        })
      });

      deliveryFindStub.onCall(1).returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            exec: sinon.stub().resolves({ ...mockDelivery, status: 'ASSIGNED', driver: driverId })
          })
        })
      });

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId, driverId });

      expect(result.status).to.equal('ASSIGNED');
      expect(result.driver).to.equal(driverId);
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
      expect(mockDriver.status).to.equal('BUSY');
    });
  });

  describe('Mutation: updateDeliveryStatus', () => {
    it('should update delivery status and release driver if DELIVERED', async () => {
      const driverId = new mongoose.Types.ObjectId().toString();
      const deliveryId = new mongoose.Types.ObjectId().toString();

      const mockDelivery = {
        _id: deliveryId,
        status: 'IN_TRANSIT',
        driver: driverId,
        save: sinon.stub().resolves()
      };

      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };

      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      const driverUpdateStub = sinon.stub(Driver, 'findByIdAndUpdate').returns({
        session: sinon.stub().resolves()
      });

      const deliveryFindStub = sinon.stub(Delivery, 'findById');
      deliveryFindStub.onCall(0).returns({
        session: sinon.stub().returns({
          exec: sinon.stub().resolves(mockDelivery)
        })
      });
      deliveryFindStub.onCall(1).returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().returns({
            exec: sinon.stub().resolves({ ...mockDelivery, status: 'DELIVERED' })
          })
        })
      });

      const result = await resolvers.Mutation.updateDeliveryStatus(null, { deliveryId, status: 'DELIVERED' });

      expect(result.status).to.equal('DELIVERED');
      expect(driverUpdateStub.calledWith(driverId, { status: 'AVAILABLE' })).to.be.true;
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
    });
  });
});
