const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

async function connectDB() {
  // MongoDB Connection
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }

  // PostgreSQL Connection
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
  });

  try {
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf8');
    await pgPool.query(initSql);
    console.log('✅ PostgreSQL connected and initialized');
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
  }

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => console.error('❌ Redis Error:', err));

  try {
    await redisClient.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('❌ Redis connection error:', err.message);
  }

  return { pgPool, redisClient };
}

module.exports = { connectDB };
