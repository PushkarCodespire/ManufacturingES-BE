require('dotenv').config();
const app                = require('./config/app');
const { sequelize }      = require('./models');
const { runMigrations }  = require('./config/migrator');

const PORT    = process.env.PORT    || 5000;
const IS_DEV  = process.env.NODE_ENV !== 'production';

(async () => {
  try {
    // ── Step 1: Verify DB connection ─────────────────────────────────────
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // ── Step 2: Auto-run pending migrations ──────────────────────────────
    //    umzug checks SequelizeMeta table, runs only what hasn't run yet.
    //    Runs in BOTH dev and production.
    await runMigrations();

    // ── Step 3 (DEV only): Sync models as safety net ─────────────────────
    //    Catches any model changes you haven't written a migration for yet.
    //    NEVER runs in production — production relies on migrations only.
    if (IS_DEV) {
      await sequelize.sync({ alter: true });
      console.log('✅ Models synced (dev safety net — alter mode)');
    }

    // ── Step 4: Start server ──────────────────────────────────────────────
    app.listen(PORT, () => {
      console.log(`\n🚀 Dynatech ONE API  →  http://localhost:${PORT}`);
      console.log(`   Health check      →  http://localhost:${PORT}/health`);
      console.log(`   Environment       →  ${IS_DEV ? 'development' : 'production'}\n`);
    });

  } catch (err) {
    console.error('\n❌ Startup failed:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
