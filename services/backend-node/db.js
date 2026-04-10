const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function connectDB() {
  // MongoDB Connection
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  console.log('Connected to MongoDB');

  // PostgreSQL Connection
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
  });

  // Initialize PostgreSQL Schema
  const sql = await fs.promises.readFile(path.join(__dirname, 'init.sql'), 'utf8');
  await pgPool.query(sql);
  console.log('Connected to PostgreSQL and initialized schema');

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  await redisClient.connect();
  console.log('Connected to Redis');

  return { pgPool, redisClient };
}

module.exports = { connectDB };
