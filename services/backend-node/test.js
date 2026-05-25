const { expect } = require('chai');
const sinon = require('sinon');
const { resolvers } = require('./index');
const db = require('./db');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Customer = require('./models/Customer');

describe('GraphQL Resolvers', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('Query.drivers', () => {
    it('should return all drivers', async () => {
      const mockDrivers = [{ name: 'John Doe' }];
      sinon.stub(Driver, 'find').resolves(mockDrivers);

      const result = await resolvers.Query.drivers();
      expect(result).to.equal(mockDrivers);
    });
  });

  describe('Mutation.updateDriverStatus', () => {
    it('should update driver status in MongoDB and Redis', async () => {
      const mockDriver = {
        id: '1',
        status: 'OFFLINE',
        save: sinon.stub().resolves()
      };
      sinon.stub(Driver, 'findById').resolves(mockDriver);

      const mockRedis = {
        set: sinon.stub().resolves()
      };
      sinon.stub(db, 'getDB').resolves({ redis: mockRedis });

      const result = await resolvers.Mutation.updateDriverStatus(null, { id: '1', status: 'AVAILABLE' });

      expect(mockDriver.status).to.equal('AVAILABLE');
      expect(mockDriver.save.calledOnce).to.be.true;
      expect(mockRedis.set.calledWith('driver:1:status', 'AVAILABLE')).to.be.true;
      expect(result).to.equal(mockDriver);
    });
  });

  describe('Delivery.customer', () => {
    it('should return customer from parent if populated', async () => {
      const parent = { customer: { name: 'Jane Smith' } };
      const result = await resolvers.Delivery.customer(parent);
      expect(result).to.equal(parent.customer);
    });

    it('should fetch customer from DB if not populated', async () => {
      const parent = { customer: 'customerId' };
      const mockCustomer = { name: 'Jane Smith' };
      sinon.stub(Customer, 'findById').withArgs('customerId').resolves(mockCustomer);

      const result = await resolvers.Delivery.customer(parent);
      expect(result).to.equal(mockCustomer);
    });
  });
});
