const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    poolPromise = (async () => {
      const client = await pool.connect();
      try {
        const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await client.query(sql);
      } finally {
        client.release();
      }
      return pool;
    })();
  }

  if (!redisPromise) {
    const client = createClient({
      url: process.env.REDIS_URL,
    });
    client.on('error', (err) => console.log('Redis Client Error', err));
    redisPromise = client.connect();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  const [pool, redis] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return {
    pg: pool,
    redis: redis,
    mongoose: mongoose,
  };
}

module.exports = { getDB };
