const { Sequelize } = require('sequelize');
require('dotenv').config();

// Render (and most cloud hosts) provide a single DATABASE_URL.
// Local dev uses individual DB_* vars. Support both.
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // required for Render's self-signed cert
        },
      },
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host:    process.env.DB_HOST,
        port:    process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        pool:    { max: 5, min: 0, acquire: 30000, idle: 10000 },
      }
    );

module.exports = sequelize;
