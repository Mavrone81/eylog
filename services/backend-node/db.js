const { Pool } = require('pg');
const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

let pool;
let redisClient;
let mongoConnection;

const initDB = async () => {
  // PostgreSQL
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL || 'postgresql://user:password@localhost:5432/logistics'
  });

  // Redis
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();

  // MongoDB
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/logistics';
  await mongoose.connect(mongoUrl);
  mongoConnection = mongoose.connection;

  return { pool, redisClient, mongoConnection };
};

const getDB = () => {
  if (!pool || !redisClient || !mongoConnection) {
    throw new Error('Database not initialized. Call initDB first.');
  }
  return { pool, redisClient, mongoConnection };
};

module.exports = { initDB, getDB };
