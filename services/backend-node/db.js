const { Pool } = require('pg');
const mongoose = require('mongoose');
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
        connectionString: process.env.DATABASE_URL,
      });
      // Initialize Postgres schema
      const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
      await pool.query(sql);
      return pool;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL,
      });
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI);
  }

  const [pool, redis] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { pool, redis, mongoose };
}

module.exports = { getDB };
