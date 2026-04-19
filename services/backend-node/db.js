const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize PostgreSQL Schema
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf8');
    await pool.query(initSql);
    console.log('PostgreSQL Initialized');

    // Redis
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    await redisClient.connect();
    console.log('Redis Connected');

    return { pool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
