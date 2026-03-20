const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('MongoDB Connected...');

    // PostgreSQL connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
    });

    // Execute init.sql
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('PostgreSQL Connected and Initialized...');

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
    console.log('Redis Connected...');

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err.message);
    // In some environments we might want to exit, but for now we'll just log
    return { pgPool: null, redisClient: null };
  }
};

module.exports = { connectDB };
