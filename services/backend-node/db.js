const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

async function connectDB() {
  // MongoDB Connection
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  console.log('🍃 Connected to MongoDB');

  // PostgreSQL Connection
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
  });

  // Initialize PostgreSQL schema
  try {
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('🐘 PostgreSQL schema initialized');
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL schema:', err.message);
  }

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();
  console.log('🚀 Connected to Redis');

  return { pgPool, redisClient };
}

module.exports = { connectDB };
