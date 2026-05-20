const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let pool;
let redisClient;
let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const p = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
      });
      const sqlPath = path.join(__dirname, 'init.sql');
      const sql = await fs.readFile(sqlPath, 'utf8');
      await p.query(sql);
      return p;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });
      await client.connect();
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  const [pgPool, rClient] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  pool = pgPool;
  redisClient = rClient;

  return { pool, redisClient, mongoose };
}

module.exports = { getDB };
