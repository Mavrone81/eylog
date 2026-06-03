const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

describe('GraphQL Resolvers', () => {
  let dbStub;

  beforeEach(() => {
    dbStub = sinon.stub(db, 'getDB').resolves({
      pool: { query: sinon.stub().resolves() },
      redis: { set: sinon.stub().resolves() },
      mongo: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Mutation: createCustomer', () => {
    it('should create a new customer', async () => {
      const customerData = { name: 'John Doe', email: 'john@example.com' };
      const saveStub = sinon.stub(Customer.prototype, 'save').resolves({ id: '123', ...customerData });

      const result = await resolvers.Mutation.createCustomer(null, customerData);

      expect(result.name).to.equal('John Doe');
      expect(saveStub.calledOnce).to.be.true;
    });
  });

  describe('Mutation: assignDriver', () => {
    it('should assign a driver to a delivery', async () => {
      const sessionStub = {
        startTransaction: sinon.stub(),
        commitTransaction: sinon.stub(),
        abortTransaction: sinon.stub(),
        endSession: sinon.stub()
      };
      sinon.stub(mongoose, 'startSession').resolves(sessionStub);

      const driverMock = {
        id: 'driver1',
        status: 'AVAILABLE',
        save: sinon.stub().resolves(),
        session: function() { return this; }
      };
      sinon.stub(Driver, 'findById').returns(driverMock);

      const deliveryMock = {
        id: 'delivery1',
        populate: sinon.stub().resolves({ id: 'delivery1', status: 'ASSIGNED' })
      };
      sinon.stub(Delivery, 'findByIdAndUpdate').returns(deliveryMock);

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId: 'delivery1', driverId: 'driver1' });

      expect(result.status).to.equal('ASSIGNED');
      expect(sessionStub.commitTransaction.calledOnce).to.be.true;
    });

    it('should throw error if driver is not available', async () => {
        const sessionStub = {
          startTransaction: sinon.stub(),
          commitTransaction: sinon.stub(),
          abortTransaction: sinon.stub(),
          endSession: sinon.stub()
        };
        sinon.stub(mongoose, 'startSession').resolves(sessionStub);

        const driverMock = {
          id: 'driver1',
          status: 'BUSY',
          session: function() { return this; }
        };
        sinon.stub(Driver, 'findById').returns(driverMock);

        try {
          await resolvers.Mutation.assignDriver(null, { deliveryId: 'delivery1', driverId: 'driver1' });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.equal('Driver not available');
          expect(sessionStub.abortTransaction.calledOnce).to.be.true;
        }
      });
  });
});
