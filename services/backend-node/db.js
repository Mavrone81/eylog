const mongoose = require('mongoose');
const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics';
  const pgUri = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/logistics';
  const redisUri = process.env.REDIS_URL || 'redis://localhost:6379';

  await mongoose.connect(mongoUri);

  const pgPool = new Pool({ connectionString: pgUri });
  const redisClient = createClient({ url: redisUri });
  await redisClient.connect();

  const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
  await pgPool.query(initSql);

  return { pgPool, redisClient };
};

module.exports = { connectDB };
