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

      // Initialize schema
      const sqlPath = path.join(__dirname, 'init.sql');
      try {
        const sql = await fs.readFile(sqlPath, 'utf8');
        await p.query(sql);
        console.log('PostgreSQL schema initialized');
      } catch (err) {
        console.error('Failed to initialize PostgreSQL schema:', err);
      }

      return p;
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
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  const [p, redis] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  pool = p;
  redisClient = redis;

  return { pool, redisClient, mongoose };
}

module.exports = { getDB };
