const { Pool } = require('pg');
const { createClient } = require('redis');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let pool;
let redisClient;

const getDB = async () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
    });

    // Initialize schema
    const initSqlPath = path.join(__dirname, 'init.sql');
    if (fs.existsSync(initSqlPath)) {
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      await pool.query(initSql);
    }
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  return { pool, redisClient };
};

module.exports = { getDB };
