const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Initialize PostgreSQL schema
      try {
        const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(sql);
        console.log('PostgreSQL initialized');
      } catch (err) {
        console.error('PostgreSQL init error:', err);
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
      console.log('Redis connected');
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = (async () => {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
      return mongoose.connection;
    })();
  }

  const [pg, redis, mongo] = await Promise.all([poolPromise, redisPromise, mongoPromise]);
  return { pg, redis, mongo };
}

module.exports = { getDB };
