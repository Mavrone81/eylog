const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  // MongoDB Connection
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('🍃 Connected to MongoDB');

  // PostgreSQL Connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Initialize PostgreSQL schema
  const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  await pool.query(initSql);
  console.log('🐘 Connected to PostgreSQL and initialized schema');

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });
  await redisClient.connect();
  console.log('🚀 Connected to Redis');

  return { mongoose, pool, redisClient };
};

module.exports = { connectDB };
