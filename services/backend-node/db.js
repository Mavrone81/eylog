const mongoose = require('mongoose');
const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();

let pgPool;
let redisClient;
let mongooseConnection;

const initDB = async () => {
  // MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
  mongooseConnection = mongoose.connection;

  // PostgreSQL
  pgPool = new Pool({
    connectionString: process.env.POSTGRES_URI || 'postgresql://user:password@localhost:5432/logistics'
  });

  // Redis
  redisClient = redis.createClient({
    url: process.env.REDIS_URI || 'redis://localhost:6379'
  });
  await redisClient.connect();
};

const getDB = () => {
  if (!pgPool || !redisClient || !mongooseConnection) {
    throw new Error('Databases not initialized');
  }
  return { pgPool, redisClient, mongooseConnection };
};

module.exports = { initDB, getDB };
