const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let poolPromise = null;
let redisPromise = null;
let mongoPromise = null;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
      });

      const sqlPath = path.join(__dirname, 'init.sql');
      const initSql = await fs.readFile(sqlPath, 'utf8');
      await pool.query(initSql);

      return pool;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await client.connect();
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  const [pgPool, redisClient] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { pgPool, redisClient, mongoose };
}

module.exports = { getDB };
