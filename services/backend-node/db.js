const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pool;
let redisClient;

async function getDB() {
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize PostgreSQL schema
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(initSql);
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });
    await redisClient.connect();
  }

  return {
    pool,
    redis: redisClient,
    mongoose,
  };
}

module.exports = { getDB };
