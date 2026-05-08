const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let poolPromise = null;
let redisPromise = null;

async function getDB() {
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  if (!poolPromise) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
    });

    poolPromise = (async () => {
      const sqlPath = path.join(__dirname, 'init.sql');
      try {
        const sql = await fs.readFile(sqlPath, 'utf8');
        await pool.query(sql);
      } catch (err) {
        console.error('Failed to initialize PostgreSQL schema:', err);
      }
      return pool;
    })();
  }

  if (!redisPromise) {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    client.on('error', (err) => console.error('Redis Client Error', err));
    redisPromise = client.connect().then(() => client);
  }

  return {
    pg: await poolPromise,
    redis: await redisPromise,
    mongoose: mongoose.connection
  };
}

module.exports = { getDB };
