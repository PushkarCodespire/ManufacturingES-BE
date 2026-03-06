/**
 * Dynatech ONE — Auto Migration Runner
 * Uses umzug (Sequelize's official migration library).
 *
 * HOW IT WORKS:
 *  1. On every server start, umzug checks the `SequelizeMeta` table in your DB.
 *  2. It finds migrations inside /migrations that haven't run yet.
 *  3. It runs them automatically — IN ORDER — before the server opens.
 *  4. In DEV mode, sequelize.sync({ alter: true }) runs after as a safety net
 *     to catch any model changes you haven't written a migration for yet.
 *
 * WORKFLOW FOR MODEL CHANGES:
 *  1. Change your Sequelize model (add a column, rename, etc.)
 *  2. Run: npm run migration:create -- YourMigrationName
 *  3. Fill in the generated migration file (up + down)
 *  4. Restart the server — migration runs automatically.
 */

const path      = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('./database');

const umzug = new Umzug({
  migrations: {
    // Glob pattern — picks up all .js files inside /migrations
    glob: path.join(__dirname, '../migrations/*.js'),
    resolve: ({ name, path: migrationPath, context }) => {
      const migration = require(migrationPath);
      return {
        name,
        up:   async () => migration.up(context,   require('sequelize')),
        down: async () => migration.down(context, require('sequelize')),
      };
    },
  },
  // Stores migration history in the DB (SequelizeMeta table)
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger:  console,
});

/**
 * runMigrations — called automatically from index.js on startup.
 * Runs only the pending (not-yet-applied) migrations.
 */
const runMigrations = async () => {
  const pending = await umzug.pending();

  if (pending.length === 0) {
    console.log('✅ Migrations: DB is already up to date');
    return;
  }

  console.log(`\n⏳ Running ${pending.length} pending migration(s):`);
  pending.forEach((m) => console.log(`   → ${m.name}`));

  await umzug.up();
  console.log('✅ Migrations: All applied successfully\n');
};

/**
 * rollbackLastMigration — utility (called via npm run migration:down)
 */
const rollbackLastMigration = async () => {
  await umzug.down();
  console.log('✅ Rolled back last migration');
};

module.exports = { umzug, runMigrations, rollbackLastMigration };
