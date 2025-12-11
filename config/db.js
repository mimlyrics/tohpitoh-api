const { Sequelize } = require("sequelize");

const createDatabase = async () => {
  try {
    const dbName = process.env.PG_DB;
    const dbUser = process.env.PG_USER;
    const dbPass = process.env.PG_PASSWORD;
    const dbHost = process.env.PG_HOST;
    const dbPort = process.env.PG_PORT || 5432;

    if (!dbName || !dbHost) {
      console.error("❌ Missing PG_DB or PG_HOST environment variables.");
      process.exit(1);
    }

    // For cloud databases, you usually CAN'T create databases dynamically
    // The database is already created by your provider
    console.log(`ℹ️  Cloud database "${dbName}" at ${dbHost}:${dbPort}`);
    
    // Just test the connection
    const sequelize = new Sequelize(dbName, dbUser, dbPass, {
      host: dbHost,
      port: dbPort,
      dialect: "postgres",
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // For most cloud DBs
        }
      },
      logging: false,
    });

    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL database.");
    
    // No need to create database - it already exists in cloud
    console.log(`✔️ Database "${dbName}" is ready.`);
    
    return sequelize; // Return the connection for use in your app
  } catch (err) {
    console.error("Error connecting to DB:");
    console.error(err.message);
    
    // More specific error messages
    if (err.name === 'SequelizeConnectionError') {
      console.error("\ncommon fixes:");
      console.error("1. Check if PG_HOST is the FULL hostname (e.g., ...render.com)");
      console.error("2. Add SSL options for cloud databases");
      console.error("3. Whitelist your IP in the database provider's dashboard");
      console.error("4. Check if database/user exists in the cloud provider");
    }
    
    process.exit(1);
  }
};

module.exports = { createDatabase };