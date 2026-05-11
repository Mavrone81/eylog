const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

let pool;
let redisClient;
let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  // PostgreSQL Initialization
  if (!poolPromise) {
    poolPromise = (async () => {
      const config = {
        connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/logistics',
      };
      pool = new Pool(config);

      try {
        const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
        await pool.query(sql);
        console.log('PostgreSQL initialized');
      } catch (err) {
        console.error('PostgreSQL initialization error:', err);
        throw err;
      }
      return pool;
    })();
  }

  // MongoDB Initialization
  if (!mongoPromise) {
    mongoPromise = (async () => {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected');
      return mongoose.connection;
    })();
  }

  // Redis Initialization
  if (!redisPromise) {
    redisPromise = (async () => {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      redisClient.on('error', (err) => console.error('Redis Client Error', err));
      await redisClient.connect();
      console.log('Redis connected');
      return redisClient;
    })();
  }

  const [pgPool, mongoConn, redis] = await Promise.all([poolPromise, mongoPromise, redisPromise]);

  return {
    pool: pgPool,
    mongoose: mongoConn,
    redis: redis
  };
}

module.exports = { getDB };
