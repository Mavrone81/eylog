const mongoose = require('mongoose');
const { Client } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

async function connectDB() {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // PostgreSQL connection
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();
    global.pgClient = pgClient;
    console.log('Connected to PostgreSQL');

    // Initialize PG schema
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
    await pgClient.query(initSql);
    console.log('PostgreSQL schema initialized');

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    global.redisClient = redisClient;
    console.log('Connected to Redis');

  } catch (err) {
    console.error('Database connection error:', err);
    // In some test environments, we might want to continue even if DBs are not available
    if (process.env.NODE_ENV !== 'test') {
       process.exit(1);
    }
  }
}

module.exports = { connectDB };
