const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let mongoPromise = null;
let poolPromise = null;
let redisPromise = null;

async function getDB() {
  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  if (!poolPromise) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/logistics',
    });
    poolPromise = (async () => {
      try {
        const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(sql);
      } catch (err) {
        console.error('Error initializing PostgreSQL schema:', err);
      }
      return pool;
    })();
  }

  if (!redisPromise) {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    client.on('error', (err) => console.error('Redis Client Error', err));
    redisPromise = client.connect().then(() => client);
  }

  const [pool, redis] = await Promise.all([poolPromise, redisPromise]);
  await mongoPromise;

  return { mongoose, pool, redis };
}

module.exports = { getDB };
