const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB Connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected...');

    // PostgreSQL Connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize PostgreSQL Schema
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pgPool.query(initSql);
    console.log('PostgreSQL connected and initialized...');

    // Redis Connection
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Redis connected...');

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err.message);
    // In production, you might want to handle this differently
    return { pgPool: null, redisClient: null };
  }
};

module.exports = { connectDB };
