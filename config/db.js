// db.js — Checks and creates the database if missing
const { Sequelize } = require("sequelize");

const createDatabase = async () => {
  try {
    const dbName = process.env.PG_DB;
    const dbUser = process.env.PG_USER;
    const dbPass = process.env.PG_PASSWORD;
    const dbHost = process.env.PG_HOST || "localhost";
    const dbPort = process.env.PG_PORT || 5432;

    if (!dbName) {
      console.error(" PG_DB environment variable is missing.");
      process.exit(1);
    }

    // Connect to the default postgres database
    const root = new Sequelize("postgres", dbUser, dbPass, {
      host: dbHost,
      port: dbPort,
      dialect: "postgres",
      logging: false,
    });

    await root.authenticate();

    console.log("Connected to PostgreSQL root database.");

    // Check database existence using bind parameters (safe)
    const [results] = await root.query(
      `SELECT datname FROM pg_database WHERE datname = $1`,
      { bind: [dbName] }
    );

    if (results.length === 0) {
      console.log(`⚠ Database "${dbName}" does NOT exist — creating...`);

      // Use identifier quoting to avoid casing issues & SQL injection
      await root.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);

      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`✔ Database "${dbName}" already exists.`);
    }

    await root.close();
  } catch (err) {
    console.error("Error ensuring DB exists:");
    console.error(err.message || err);
    process.exit(1);
  }
};

module.exports = { createDatabase };
