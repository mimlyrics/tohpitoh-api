const { Sequelize } = require("sequelize");

const dbName = process.env.PG_DB;
const dbUser = process.env.PG_USER;
const dbPass = process.env.PG_PASSWORD;
const dbHost = process.env.PG_HOST || "localhost";
const dbPort = process.env.PG_PORT || 5432;

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: "postgres",
  logging: false,
});

module.exports = sequelize;
