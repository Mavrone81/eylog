const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function connectDB() {
  // MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  console.log('Connected to MongoDB');

  // PostgreSQL
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Init PostgreSQL schema
  const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf-8');
  await pgPool.query(initSql);
  console.log('Connected to PostgreSQL and initialized schema');

  // Redis
  const redisClient = createClient({
    url: process.env.REDIS_URL
  });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();
  console.log('Connected to Redis');

  return { mongoose, pgPool, redisClient };
}

module.exports = { connectDB };
