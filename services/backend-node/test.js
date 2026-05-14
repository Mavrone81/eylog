const assert = require('assert');
const { typeDefs, resolvers } = require('./index');
const { ApolloServer } = require('@apollo/server');
const Driver = require('./models/Driver');
const Customer = require('./models/Customer');
const Delivery = require('./models/Delivery');
const db = require('./db');

describe('GraphQL Backend Tests (Mocked)', () => {
  let server;

  before(() => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    // Mock getDB
    db.getDB = async () => ({
      mongoose: { connection: { readyState: 1 } },
      pgPool: { query: async () => ({ rows: [{ id: 1 }] }) },
      redisClient: { set: async () => {}, get: async () => 'BUSY' }
    });

    // Mock Mongoose Models with all required fields for GraphQL
    Driver.create = async (data) => ({
      id: 'drv1',
      name: data.name,
      phone: data.phone || '123',
      status: 'AVAILABLE',
      save: async () => {}
    });
    Driver.findById = async (id) => ({
      id,
      name: 'John',
      phone: '123',
      status: 'AVAILABLE',
      save: async () => {}
    });
    Driver.find = async () => [{
      id: 'drv1',
      name: 'John',
      phone: '123',
      status: 'AVAILABLE'
    }];

    Customer.create = async (data) => ({
      id: 'cust1',
      name: data.name,
      email: data.email || 'a@b.com',
      phone: data.phone || '123',
      address: data.address || 'addr'
    });
    Customer.findById = async (id) => ({
      id,
      name: 'Jane',
      email: 'jane@example.com',
      phone: '123',
      address: 'addr'
    });
    Customer.find = async () => [{
      id: 'cust1',
      name: 'Jane',
      email: 'jane@example.com',
      phone: '123',
      address: 'addr'
    }];

    Delivery.create = async (data) => ({
      id: 'del1',
      status: 'PENDING',
      customerId: data.customerId,
      origin: data.origin,
      destination: data.destination,
      save: async () => {}
    });
    Delivery.findById = async (id) => ({
      id,
      status: 'PENDING',
      customerId: 'cust1',
      save: async () => {}
    });
    Delivery.find = async () => [{
      id: 'del1',
      status: 'PENDING',
      customerId: 'cust1'
    }];
  });

  it('should create a driver', async () => {
    const res = await server.executeOperation({
      query: 'mutation CreateDriver($name: String!, $phone: String!) { createDriver(name: $name, phone: $phone) { id name status } }',
      variables: { name: 'John Doe', phone: '1234567890' },
    });

    assert.strictEqual(res.body.singleResult.data.createDriver.name, 'John Doe');
  });

  it('should create a customer', async () => {
    const res = await server.executeOperation({
      query: 'mutation CreateCustomer($name: String!, $email: String!, $phone: String!, $address: String!) { createCustomer(name: $name, email: $email, phone: $phone, address: $address) { id name email } }',
      variables: { name: 'Jane Smith', email: 'jane@example.com', phone: '0987654321', address: '456 Elm St' },
    });

    assert.strictEqual(res.body.singleResult.data.createCustomer.name, 'Jane Smith');
    assert.strictEqual(res.body.singleResult.data.createCustomer.email, 'jane@example.com');
  });

  it('should create a delivery', async () => {
    const res = await server.executeOperation({
      query: 'mutation CreateDelivery($customerId: ID!, $origin: LocationInput!, $destination: LocationInput!) { createDelivery(customerId: $customerId, origin: $origin, destination: $destination) { id status } }',
      variables: {
        customerId: 'cust1',
        origin: { lat: 40.7128, lng: -74.0060, address: 'Origin' },
        destination: { lat: 34.0522, lng: -118.2437, address: 'Dest' }
      },
    });

    assert.strictEqual(res.body.singleResult.data.createDelivery.status, 'PENDING');
  });

  it('should assign a driver', async () => {
    const res = await server.executeOperation({
      query: 'mutation AssignDriver($deliveryId: ID!, $driverId: ID!) { assignDriver(deliveryId: $deliveryId, driverId: $driverId) { id status } }',
      variables: { deliveryId: 'del1', driverId: 'drv1' },
    });

    assert.strictEqual(res.body.singleResult.data.assignDriver.status, 'ASSIGNED');
  });
});
