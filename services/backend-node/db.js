const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/delivery_db',
      });

      // Initialize PostgreSQL schema
      const initSqlPath = path.join(__dirname, 'init.sql');
      if (fs.existsSync(initSqlPath)) {
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        await pool.query(initSql);
      }

      return pool;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/delivery_platform');
  }

  const [pg, redis] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { pg, redis, mongoose };
}

module.exports = { getDB };
