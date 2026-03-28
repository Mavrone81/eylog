const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function connectDB() {
  // MongoDB Connection
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }

  // PostgreSQL Connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf-8');
    await pool.query(initSql);
    console.log('PostgreSQL initialized');
  } catch (err) {
    console.error('PostgreSQL initialization error:', err);
  }

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Redis connection error:', err);
  }

  return { mongoose, pool, redisClient };
}

module.exports = { connectDB };
