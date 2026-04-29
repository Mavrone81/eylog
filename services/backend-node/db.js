const mongoose = require('mongoose');
const { Pool } = require('pg');
const redis = require('redis');
const path = require('path');
const fs = require('fs');

let pgPool;
let redisClient;

const connectDB = async () => {
  try {
    // MongoDB Connection
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('Connected to MongoDB');

    // PostgreSQL Connection
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
    });

    // Initialize PostgreSQL schema if needed
    const initSqlPath = path.join(__dirname, 'init.sql');
    if (fs.existsSync(initSqlPath)) {
      const sql = fs.readFileSync(initSqlPath).toString();
      await pgPool.query(sql);
      console.log('PostgreSQL schema initialized');
    }

    // Redis Connection
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis');

  } catch (err) {
    console.error('Database connection error:', err);
    // In a real app we might want to exit, but for now we'll just log
  }
};

const getDB = () => ({
  pg: pgPool,
  redis: redisClient,
  mongoose
});

module.exports = { connectDB, getDB };
