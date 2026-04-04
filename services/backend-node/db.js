const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('MongoDB connected');

    // PostgreSQL
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
    });

    // Initialize PostgreSQL schema
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf-8');
    await pgPool.query(initSql);
    console.log('PostgreSQL connected and schema initialized');

    // Redis
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
    console.log('Redis connected');

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
