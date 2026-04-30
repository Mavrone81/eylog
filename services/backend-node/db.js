const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

let pgPool;
let redisClient;

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

async function connectPostgreSQL() {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
  });
  console.log('Connected to PostgreSQL');

  const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  await pgPool.query(initSql);
}

async function connectRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();
  console.log('Connected to Redis');
}

async function getDB() {
  if (!pgPool || !redisClient) {
    await Promise.all([
      connectMongoDB(),
      connectPostgreSQL(),
      connectRedis()
    ]);
  }
  return {
    pg: pgPool,
    redis: redisClient,
    mongoose,
  };
}

module.exports = { getDB };
