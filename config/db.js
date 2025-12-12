require("dotenv").config();
const { Pool } = require("pg");

const createDatabase = () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Optional one-time connection test
  pool.connect()
    .then(client => {
      console.log("✅ Connected to PostgreSQL");
      console.log("🔐 SSL enabled");
      client.release();
    })
    .catch(err => {
      console.error("❌ PostgreSQL connection error:", err.message);
    });

  return {
    query: (text, params) => pool.query(text, params),
    pool
  };
};

module.exports = { createDatabase };
