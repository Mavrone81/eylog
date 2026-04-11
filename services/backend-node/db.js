const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

const connectDB = async () => {
  // MongoDB Connection
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Connected');

  // PostgreSQL Connection
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });
  await redisClient.connect();
  console.log('Redis Connected');

  // Initialize PostgreSQL schema
  const initSqlPath = path.join(__dirname, 'init.sql');
  const initSql = await fs.readFile(initSqlPath, 'utf8');
  await pgPool.query(initSql);
  console.log('PostgreSQL Initialized');

  return { pgPool, redisClient };
};

module.exports = { connectDB };
