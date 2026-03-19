const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  // MongoDB Connection
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('🍃 MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }

  // PostgreSQL Connection
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
  });

  try {
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('🐘 PostgreSQL Schema Initialized');
  } catch (err) {
    console.error('PostgreSQL initialization error:', err.message);
  }

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));

  try {
    await redisClient.connect();
    console.log('🎈 Redis Connected');
  } catch (err) {
    console.error('Redis connection error:', err.message);
  }

  return { pgPool, redisClient };
};

module.exports = { connectDB };
