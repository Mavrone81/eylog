const { Pool } = require('pg');
const redis = require('redis');
const mongoose = require('mongoose');
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
        connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
      });
      try {
        const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await p.query(sql);
      } catch (err) {
        console.error('Postgres init error:', err);
      }
      pool = p;
      return p;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      await client.connect();
      redisClient = client;
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  const [pgPool, rClient, mConn] = await Promise.all([poolPromise, redisPromise, mongoPromise]);
  return { pool: pgPool, redis: rClient, mongoose: mConn };
}

module.exports = { getDB };
