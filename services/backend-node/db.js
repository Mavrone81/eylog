const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  // MongoDB Connection
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  console.log('🍃 MongoDB Connected');

  // PostgreSQL Connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
  });

  // Initialize PostgreSQL Schema
  const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  await pool.query(initSql);
  console.log('🐘 PostgreSQL Initialized');

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  await redisClient.connect();
  console.log('🔴 Redis Connected');

  return { pool, redisClient };
};

module.exports = { connectDB };
