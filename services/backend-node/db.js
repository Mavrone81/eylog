const { Pool } = require('pg');
const { createClient } = require('redis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

let pool;
let redisClient;
let poolPromise;
let redisPromise;

async function getDB() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const p = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      const initSql = await fs.readFile(path.join(__dirname, 'init.sql'), 'utf8');
      await p.query(initSql);
      pool = p;
      return p;
    })();
  }

  if (!redisPromise) {
    redisPromise = (async () => {
      const client = createClient({
        url: process.env.REDIS_URL,
      });
      await client.connect();
      redisClient = client;
      return client;
    })();
  }

  await Promise.all([poolPromise, redisPromise]);

  return { pool, redisClient };
}

module.exports = { getDB };
