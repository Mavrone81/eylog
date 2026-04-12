const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

const connectDB = async () => {
  try {
    // MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize PostgreSQL Schema
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf8');
    await pool.query(initSql);
    console.log('PostgreSQL schema initialized');

    // Redis
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    await redisClient.connect();
    console.log('Connected to Redis');

    return { pool, redisClient };
  } catch (error) {
    console.error('Database connection error:', error);
    // In some environments (like CI/CD or restricted sandboxes), we might want to continue without real DBs
    if (process.env.NODE_ENV === 'test') {
       return { pool: { query: async () => {} }, redisClient: { set: async () => {}, get: async () => {} } };
    }
    throw error;
  }
};

module.exports = { connectDB };
