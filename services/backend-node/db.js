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
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }

  // PostgreSQL Connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
  });

  try {
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(initSql);
    console.log('Connected to PostgreSQL and schema initialized');
  } catch (err) {
    console.error('PostgreSQL error:', err);
  }

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));

  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Redis connection error:', err);
  }

  return { pool, redisClient };
};

module.exports = { connectDB };
