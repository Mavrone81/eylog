const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

const connectDB = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('MongoDB connected');

    // PostgreSQL connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
    });

    // Initialize PostgreSQL schema
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(initSql);
    console.log('PostgreSQL connected and schema initialized');

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Redis connected');

    return { pool, redisClient };
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
