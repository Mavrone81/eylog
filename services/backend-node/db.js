const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

let pgPool;
let redisClient;

const getDB = async () => {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics',
    });

    // Initialize PostgreSQL schema
    try {
      const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
      await pgPool.query(initSql);
      console.log('PostgreSQL schema initialized');
    } catch (err) {
      console.error('Error initializing PostgreSQL schema:', err);
    }
  }

  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics');
    console.log('Connected to MongoDB');
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis');
  }

  return { pgPool, redisClient, mongoose };
};

module.exports = { getDB };
