const mongoose = require('mongoose');
const { Client } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Redis connection
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Redis connected');

    // PostgreSQL connection
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    await pgClient.connect();
    console.log('PostgreSQL connected');

    // Initialize PostgreSQL schema
    const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf-8');
    await pgClient.query(initSql);
    console.log('PostgreSQL schema initialized');

    return { mongoose, redisClient, pgClient };
  } catch (error) {
    console.error('Database connection error:', error);
    // In a real environment, we might want to exit, but for MVP we might want to continue or mock
    // process.exit(1);
    return { mongoose, error };
  }
};

module.exports = { connectDB };
