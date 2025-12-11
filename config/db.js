const { Sequelize } = require('sequelize');

const createDatabase = async () => {
  try {
    const dbName = process.env.PG_DB;
    const dbUser = process.env.PG_USER;
    const dbPass = process.env.PG_PASSWORD;
    const dbHost = process.env.PG_HOST;
    const dbPort = process.env.PG_PORT || 5432;

    if (!dbName || !dbHost) {
      console.error('❌ Missing PG_DB or PG_HOST environment variables.');
      process.exit(1);
    }

    console.log(`🔧 Connecting to database "${dbName}" at ${dbHost}:${dbPort}`);

    // Create connection WITH SSL
    const sequelize = new Sequelize(dbName, dbUser, dbPass, {
      host: dbHost,
      port: dbPort,
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });

    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL database with SSL.');
    
    return sequelize;
  } catch (err) {
    console.error('❌ Error connecting to DB:');
    console.error(err.message);
    
    if (err.name === 'SequelizeConnectionError') {
      console.error('\n🔍 Troubleshooting tips:');
      console.error('1. Verify SSL is supported by your database provider');
      console.error('2. Check if hostname is correct (should end with .render.com, .neon.tech, etc.)');
      console.error('3. Verify username/password are correct');
      console.error('4. Check if your IP is whitelisted in the database dashboard');
    }
    
    process.exit(1);
  }
};

module.exports = { createDatabase };