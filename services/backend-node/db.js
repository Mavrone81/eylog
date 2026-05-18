const { Pool } = require('pg');
const redis = require('redis');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

let poolPromise = null;
let redisPromise = null;
let mongoPromise = null;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Initialize PostgreSQL schema
      try {
        const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(sql);
      } catch (err) {
        console.error('Failed to initialize PostgreSQL schema:', err);
      }

      return pool;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = redis.createClient({
        url: process.env.REDIS_URL,
      });
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  const [pg, redisClient] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { pg, redis: redisClient, mongoose };
}

module.exports = { getDB };
