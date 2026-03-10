const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected...');

    // PostgreSQL connection
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
    });
    console.log('PostgreSQL Pool Created...');

    // Redis connection
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Redis Connected...');

    return { pgPool, redisClient };
  } catch (err) {
    console.error('Database connection error:', err.message);
    // Continue even if some databases fail, but in production, you might want to exit
    return { pgPool: null, redisClient: null };
  }
};

module.exports = connectDB;
