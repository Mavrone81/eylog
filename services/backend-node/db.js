const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

async function connectDB() {
  // MongoDB Connection
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // PostgreSQL Connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Initialize PostgreSQL schema
  const initSqlPath = path.join(__dirname, 'init.sql');
  try {
    const sql = await fs.readFile(initSqlPath, 'utf8');
    await pool.query(sql);
    console.log('PostgreSQL schema initialized');
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err);
  }

  // Redis Connection
  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });
  await redisClient.connect();
  console.log('Connected to Redis');

  return { pool, redisClient };
}

module.exports = { connectDB };
