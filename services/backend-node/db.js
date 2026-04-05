const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB Connection
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('MongoDB Connected...');

    // PostgreSQL Connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/logistics'
    });

    // Initialize PostgreSQL Schema
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf8');
    await pool.query(initSql);
    console.log('PostgreSQL Connected and Initialized...');

    // Redis Connection
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
    console.log('Redis Connected...');

    return { pool, redisClient };
  } catch (err) {
    console.error('Database Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
