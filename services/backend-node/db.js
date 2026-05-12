const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let poolPromise = null;
let redisPromise = null;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Initialize schema
      try {
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        await pool.query(sql);
        console.log('PostgreSQL schema initialized');
      } catch (err) {
        console.error('Failed to initialize PostgreSQL schema:', err);
      }
      return pool;
    })();
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL,
      });
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      console.log('Connected to Redis');
      return client;
    })();
  }

  return {
    pg: await poolPromise,
    mongo: mongoose.connection,
    redis: await redisPromise,
  };
}

module.exports = { getDB };
