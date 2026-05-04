const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pool;
let redisClient;

const getDB = async () => {
  // MongoDB
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  // PostgreSQL
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/logistics',
    });

    // Initialize schema
    try {
      const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
      await pool.query(sql);
    } catch (err) {
      console.error('Error initializing PostgreSQL schema:', err);
    }
  }

  // Redis
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
  }

  return { pool, redisClient, mongoose };
};

module.exports = { getDB };
