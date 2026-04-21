const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

const connectDB = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // PostgreSQL connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize PostgreSQL schema
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('Connected to PostgreSQL and initialized schema');

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    await redisClient.connect();
    console.log('Connected to Redis');

    return { pgPool, redisClient };
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };
