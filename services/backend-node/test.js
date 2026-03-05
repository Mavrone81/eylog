const { resolvers } = require('./index');
const assert = require('assert');

async function runTests() {
  console.log('Running Backend Node Tests...');

  // Test Query.deliveries
  const deliveries = resolvers.Query.deliveries();
  assert(Array.isArray(deliveries), 'Deliveries should be an array');
  console.log('✓ Query.deliveries works');

  // Test Mutation.createDelivery
  const newDelivery = resolvers.Mutation.createDelivery(null, {
    originLat: 10,
    originLng: 20,
    destLat: 30,
    destLng: 40
  });
  assert.strictEqual(newDelivery.status, 'PENDING');
  assert.strictEqual(newDelivery.origin.lat, 10);
  console.log('✓ Mutation.createDelivery works');

  // Test Mutation.assignDriver
  const updatedDelivery = resolvers.Mutation.assignDriver(null, {
    deliveryId: newDelivery.id,
    driverId: 'd1'
  });
  assert.strictEqual(updatedDelivery.status, 'ASSIGNED');
  assert.strictEqual(updatedDelivery.driverId, 'd1');
  console.log('✓ Mutation.assignDriver works');

  console.log('All Backend Node Tests Passed!');
}

runTests().catch(err => {
  console.error('Tests failed:', err);
  process.exit(1);
});
