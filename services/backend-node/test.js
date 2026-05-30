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

  describe('Query', () => {
    it('should return all drivers', async () => {
      const mockDrivers = [{ id: '1', name: 'John Doe', status: 'AVAILABLE' }];
      sinon.stub(Driver, 'find').resolves(mockDrivers);

      const result = await resolvers.Query.drivers();
      expect(result).to.deep.equal(mockDrivers);
    });

    it('should return a specific delivery', async () => {
      const mockDelivery = {
        id: '1',
        status: 'PENDING',
        populate: function() { return this; }
      };
      const findByIdStub = sinon.stub(Delivery, 'findById').returns(mockDelivery);

      const result = await resolvers.Query.delivery(null, { id: '1' });
      expect(result.id).to.equal('1');
      expect(findByIdStub.calledWith('1')).to.be.true;
    });
  });

  describe('Mutation', () => {
    it('should update driver status', async () => {
      const mockDriver = { id: '1', name: 'John Doe', status: 'BUSY' };
      sinon.stub(Driver, 'findByIdAndUpdate').resolves(mockDriver);

      const mockRedis = { set: sinon.stub().resolves() };
      dbStub.resolves({ redis: mockRedis });

      const result = await resolvers.Mutation.updateDriverStatus(null, { driverId: '1', status: 'BUSY' });
      expect(result.status).to.equal('BUSY');
      expect(mockRedis.set.calledWith('driver:1:status', 'BUSY')).to.be.true;
    });

    it('should create a delivery and log event', async () => {
      const mockCustomer = { id: 'c1', name: 'Test Customer' };
      const mockDelivery = {
        id: 'd1',
        customer: 'c1',
        populate: sinon.stub().resolves({ id: 'd1', customer: mockCustomer })
      };

      sinon.stub(Delivery, 'create').resolves(mockDelivery);
      const mockPg = { query: sinon.stub().resolves() };
      dbStub.resolves({ pg: mockPg });

      const result = await resolvers.Mutation.createDelivery(null, {
        customerId: 'c1',
        origin: { address: 'Origin' },
        destination: { address: 'Dest' }
      });

      expect(result.id).to.equal('d1');
      expect(mockPg.query.calledOnce).to.be.true;
    });
  });
});
