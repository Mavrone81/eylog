const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let poolPromise;
let redisPromise;

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
      } catch (err) {
        console.error('Failed to initialize PostgreSQL schema:', err);
      }
      return pool;
    })();
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({ url: process.env.REDIS_URL });
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      return client;
    })();
  }

  const [pgPool, redisClient] = await Promise.all([poolPromise, redisPromise]);

  return {
    pg: pgPool,
    mongo: mongoose.connection,
    redis: redisClient,
  };
}

module.exports = { getDB };
