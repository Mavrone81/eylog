const { Pool } = require('pg');
const redis = require('redis');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
        const schema = await fs.promises.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(schema);
        console.log('PostgreSQL schema initialized');
      } catch (err) {
        console.error('Error initializing PostgreSQL schema:', err);
      }
      return pool;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = redis.createClient({
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

  const [pool, redisClient, mongoConn] = await Promise.all([
    poolPromise,
    redisPromise,
    mongoPromise,
  ]);

  return { pool, redisClient, mongoConn };
}

module.exports = { getDB };
