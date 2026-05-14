const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let poolPromise = null;
let redisPromise = null;

async function getDB() {
  // MongoDB Connection
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('Connected to MongoDB');
  }

  // PostgreSQL Connection with Lock
  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Initialize Schema
      const initSqlPath = path.join(__dirname, 'init.sql');
      const initSql = await fs.promises.readFile(initSqlPath, 'utf8');
      await pool.query(initSql);
      console.log('PostgreSQL initialized');
      return pool;
    })();
  }
  const pgPool = await poolPromise;

  // Redis Connection with Lock
  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL,
      });
      client.on('error', (err) => console.log('Redis Client Error', err));
      await client.connect();
      console.log('Connected to Redis');
      return client;
    })();
  }
  const redisClient = await redisPromise;

  return {
    mongoose,
    pgPool,
    redisClient,
  };
}

module.exports = { getDB };
