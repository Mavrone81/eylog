const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB connection
    if (process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
    }

    // PostgreSQL connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Redis connected');

    // Initialize PostgreSQL schema if init.sql exists
    const initSqlPath = path.join(__dirname, 'init.sql');
    try {
      const initSql = await fs.readFile(initSqlPath, 'utf8');
      await pgPool.query(initSql);
      console.log('PostgreSQL schema initialized');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('PostgreSQL init error:', err.message);
      }
    }

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err.message);
    return { pgPool: null, redisClient: null };
  }
};

module.exports = { connectDB };
