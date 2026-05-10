const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let pool;
let redisClient;
let mongoConnected = false;

let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  // PostgreSQL Initialization
  if (!poolPromise) {
    poolPromise = (async () => {
      const p = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
      });

      // Initialize schema
      try {
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        await p.query(sql);
        console.log('PostgreSQL schema initialized');
      } catch (err) {
        console.error('Error initializing PostgreSQL schema:', err);
      }

      pool = p;
      return p;
    })();
  }

  // Redis Initialization
  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      redisClient = client;
      return client;
    })();
  }

  // MongoDB Initialization
  if (!mongoPromise) {
    mongoPromise = (async () => {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
      await mongoose.connect(uri);
      mongoConnected = true;
      return mongoose;
    })();
  }

  await Promise.all([poolPromise, redisPromise, mongoPromise]);

  return {
    pool,
    redisClient,
    mongoose
  };
}

module.exports = { getDB };
