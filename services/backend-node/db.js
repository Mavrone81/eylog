const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

const connectDB = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // PostgreSQL connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize PostgreSQL schema
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('PostgreSQL connected and initialized');

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    await redisClient.connect();
    console.log('Redis connected');

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

module.exports = { connectDB };
