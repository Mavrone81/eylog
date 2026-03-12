const assert = require('assert');
const { typeDefs, resolvers } = require('./index');

describe('GraphQL Resolvers', () => {
  it('should have a deliveries query', () => {
    assert.strictEqual(typeof resolvers.Query.deliveries, 'function');
  });

  it('should have a createDelivery mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.createDelivery, 'function');
  });

  it('should have an assignDriver mutation', () => {
    assert.strictEqual(typeof resolvers.Mutation.assignDriver, 'function');
  });

  describe('Mutation error handling', () => {
    it('assignDriver should throw error if delivery not found', async () => {
      const mockContext = {
        redisClient: {
          set: () => {}
        }
      };

      // Mock Delivery.findByIdAndUpdate to return null
      const Delivery = require('./models/Delivery');
      const originalFindByIdAndUpdate = Delivery.findByIdAndUpdate;
      Delivery.findByIdAndUpdate = () => ({
        populate: () => Promise.resolve(null)
      });

      try {
        await resolvers.Mutation.assignDriver(null, { deliveryId: 'invalid', driverId: 'driver1' }, mockContext);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.message, 'Delivery not found');
      } finally {
        Delivery.findByIdAndUpdate = originalFindByIdAndUpdate;
      }
    });
  });
});
