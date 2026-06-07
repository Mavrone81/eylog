const { Pool } = require('pg');
const redis = require('redis');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let poolPromise;
let redisPromise;
let redisClient;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    poolPromise = (async () => {
      const client = await pool.connect();
      try {
        const initSql = await fs.promises.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await client.query(initSql);
      } finally {
        client.release();
      }
      return pool;
    })();
  }

  if (!redisPromise) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisPromise = redisClient.connect();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI);
  }

  const [pool] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { pool, redisClient, mongoose };
}

module.exports = { getDB };
