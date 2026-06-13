const mongoose = require('mongoose');
const { Pool } = require('pg');
const redis = require('redis');

let pool;
let redisClient;
let poolPromise;
let redisPromise;
let mongoPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const p = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'user',
        password: process.env.POSTGRES_PASSWORD || 'password',
        database: process.env.POSTGRES_DB || 'logistics',
      });
      pool = p;
      return p;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = redis.createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
      });
      await client.connect();
      redisClient = client;
      return client;
    })();
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  }

  const [pgPool, rClient, mConn] = await Promise.all([poolPromise, redisPromise, mongoPromise]);

  return {
    pool: pgPool,
    redis: rClient,
    mongoose: mConn
  };
}

module.exports = { getDB };
