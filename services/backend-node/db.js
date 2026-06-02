const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let poolPromise;
let mongoPromise;
let redisPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
      });
      // Initialize schema
      const initSqlPath = path.join(__dirname, 'init.sql');
      try {
        const initSql = await fs.readFile(initSqlPath, 'utf8');
        await pool.query(initSql);
      } catch (err) {
        console.error('Error initializing PostgreSQL schema:', err);
      }
      return pool;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      client.on('error', (err) => console.log('Redis Client Error', err));
      await client.connect();
      return client;
    })();
  }

  const [pool, redis] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { pool, mongoose, redis };
}

module.exports = { getDB };
