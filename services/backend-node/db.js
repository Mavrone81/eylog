const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

async function connectDB() {
  try {
    // MongoDB Connection
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('Connected to MongoDB');

    // PostgreSQL Connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
    });
    console.log('Connected to PostgreSQL');

    // Initialize PostgreSQL Schema
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf8');
    await pgPool.query(initSql);
    console.log('PostgreSQL schema initialized');

    // Redis Connection
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis');

    return { pgPool, redisClient };
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

module.exports = { connectDB };
