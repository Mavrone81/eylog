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

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  if (!redisPromise) {
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisPromise = redisClient.connect().then(() => redisClient);
  }

  const [pool, redis] = await Promise.all([poolPromise, redisPromise]);
  const mongo = await mongoPromise;

  return { pg: pool, mongo, redis };
}

module.exports = { getDB };
