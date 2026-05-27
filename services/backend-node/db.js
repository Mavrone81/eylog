const { Pool } = require('pg');
const { createClient } = require('redis');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      try {
        const initSqlPath = path.join(__dirname, 'init.sql');
        const initSql = await fs.readFile(initSqlPath, 'utf8');
        await pool.query(initSql);
      } catch (err) {
        console.error('Failed to initialize PostgreSQL schema:', err);
      }
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

  const [pg, redis] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { pg, redis, mongoose };
}

module.exports = { getDB };
