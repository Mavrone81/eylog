const mongoose = require('mongoose');
const { Pool } = require('pg');
const redis = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let pool;
let redisClient;
let mongoConn;

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
      const sqlPath = path.join(__dirname, 'init.sql');
      try {
        const sql = await fs.readFile(sqlPath, 'utf8');
        await p.query(sql);
        console.log('PostgreSQL initialized');
      } catch (err) {
        console.error('Error initializing PostgreSQL:', err);
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
      client.on('error', (err) => console.error('Redis Client Error', err));
      await client.connect();
      console.log('Redis connected');
      redisClient = client;
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = (async () => {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
      mongoConn = mongoose.connection;
      return mongoose.connection;
    })();
  }

  await Promise.all([poolPromise, redisPromise, mongoPromise]);

  return {
    pool,
    redis: redisClient,
    mongoose: mongoConn,
  };
}

module.exports = { getDB };
