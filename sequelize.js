const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
    define: {
    timestamps: true,
    underscored: false, // Should be false for camelCase (createdAt)
    // If you want to force camelCase:
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  logging: false
});

module.exports = sequelize;
