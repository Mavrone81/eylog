const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
  const pgUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics';
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // MongoDB
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // PostgreSQL
  const pgPool = new Pool({
    connectionString: pgUrl,
  });

  // Run init.sql
  try {
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('PostgreSQL initialized');
  } catch (err) {
    console.error('Error initializing PostgreSQL:', err);
  }

  // Redis
  const redisClient = createClient({
    url: redisUrl,
  });
  await redisClient.connect();
  console.log('Connected to Redis');

  return { pgPool, redisClient };
}

module.exports = { connectDB };
