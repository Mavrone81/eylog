const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // PostgreSQL connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    console.log('Connected to PostgreSQL');

    // Initialize PostgreSQL schema if init.sql exists
    const initSqlPath = path.join(__dirname, 'init.sql');
    try {
      const initSql = await fs.readFile(initSqlPath, 'utf8');
      await pgPool.query(initSql);
      console.log('PostgreSQL schema initialized');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error initializing PostgreSQL schema:', err);
      }
    }

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    await redisClient.connect();
    console.log('Connected to Redis');

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
};

module.exports = { connectDB };
