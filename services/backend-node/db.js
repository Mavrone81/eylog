const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let pool;
let redisClient;

const connectDB = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('Connected to MongoDB');

    // PostgreSQL connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
    });
    await pool.connect();
    console.log('Connected to PostgreSQL');

    // Initialize PostgreSQL schema
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf-8');
    await pool.query(initSql);
    console.log('PostgreSQL schema initialized');

    // Redis connection
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis');

    return { pool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
};

const getDB = () => ({ pool, redisClient });

module.exports = { connectDB, getDB };
