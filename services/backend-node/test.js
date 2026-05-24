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
      redis: { set: sinon.stub().resolves() },
      mongoose: {}
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Query.deliveries', () => {
    it('should return all deliveries', async () => {
      const mockQuery = {
        populate: sinon.stub().returnsThis(),
        exec: sinon.stub().resolves([{ id: '1', status: 'PENDING' }])
      };
      // In mongoose find().populate().populate() returns the query object
      // But for simplicity in resolvers we might just be doing find().populate().populate()
      // which returns a Query object that is then-able.

      const findStub = sinon.stub(Delivery, 'find').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves([{ id: '1', status: 'PENDING' }])
        })
      });

      const result = await resolvers.Query.deliveries();
      expect(result).to.be.an('array');
      expect(result[0].status).to.equal('PENDING');
    });
  });

  describe('Mutation.assignDriver', () => {
    it('should assign a driver to a delivery', async () => {
      sinon.stub(Driver, 'findById').resolves({ id: 'd1', name: 'John' });
      sinon.stub(Delivery, 'findByIdAndUpdate').returns({
        populate: sinon.stub().returns({
          populate: sinon.stub().resolves({ id: 'del1', status: 'ASSIGNED', driver: { id: 'd1' } })
        })
      });
      sinon.stub(Driver, 'findByIdAndUpdate').resolves();

      const result = await resolvers.Mutation.assignDriver(null, { deliveryId: 'del1', driverId: 'd1' });
      expect(result.status).to.equal('ASSIGNED');
    });
  });
});
