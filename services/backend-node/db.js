const { Pool } = require('pg');
const redis = require('redis');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let pool;
let redisClient;
let mongooseConnection;
let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const p = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      // Initialize schema
      try {
        const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await p.query(initSql);
      } catch (err) {
        console.error('Failed to initialize PostgreSQL schema:', err);
      }
      pool = p;
      return p;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = redis.createClient({
        url: process.env.REDIS_URL,
      });
      await client.connect();
      redisClient = client;
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = (async () => {
      await mongoose.connect(process.env.MONGODB_URI);
      mongooseConnection = mongoose.connection;
      return mongoose.connection;
    })();
  }

  await Promise.all([poolPromise, redisPromise, mongoPromise]);

  return {
    pool,
    redisClient,
    mongoose: mongooseConnection,
  };
}

module.exports = { getDB };
