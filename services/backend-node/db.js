const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');
require('dotenv').config();

const connectDB = async () => {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics'
  });

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');

  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  await redisClient.connect();

  return { pgPool, mongoose, redisClient };
};

module.exports = connectDB;
