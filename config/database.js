const { Sequelize } = require('sequelize');
// require('dotenv').config();

// Build connection URL from individual DB_* env vars.
// Using Cloud SQL IAM auth — no password required, proxy handles authentication.
// DB_USER contains '@' (IAM service account) — encode it so the URL is valid.
const host    = process.env.DB_HOST || 'localhost';
const port    = process.env.DB_PORT || '5432';
const name    = process.env.DB_NAME;
const user    = encodeURIComponent(process.env.DB_USER || ''); // encodes '@' → '%40'

const connectionUrl = `postgresql://${user}@${host}:${port}/${name}`;

const sequelize = new Sequelize(connectionUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.DATABASE_SSL === 'true'
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
});

module.exports = sequelize;
