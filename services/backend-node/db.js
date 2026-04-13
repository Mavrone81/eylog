const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

async function connectDB() {
  // MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }

  // PostgreSQL
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
  });

  try {
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('PostgreSQL initialized');
  } catch (err) {
    console.error('PostgreSQL error:', err);
  }

  // Redis
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Redis connection error:', err);
  }

  return { pgPool, redisClient };
}

module.exports = { connectDB };
