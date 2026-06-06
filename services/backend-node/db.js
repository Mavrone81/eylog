const { Pool } = require('pg');
const mongoose = require('mongoose');
const redis = require('redis');
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
        connectionString: process.env.DATABASE_URL,
      });
      const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
      await pool.query(initSql);
      return pool;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI);
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = redis.createClient({
        url: process.env.REDIS_URL,
      });
      await client.connect();
      return client;
    })();
  }

  const [pgPool, redisClient] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return {
    pg: pgPool,
    mongo: mongoose.connection,
    redis: redisClient,
  };
}

module.exports = { getDB };
