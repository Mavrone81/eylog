const { Pool } = require('pg');
const mongoose = require('mongoose');
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
      const sql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
      await p.query(sql);
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
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      mongoConn = conn;
      return conn;
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
