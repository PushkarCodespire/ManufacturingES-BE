require('dotenv').config();

// Normalize JWT_SECRET — K8s envFrom.secretRef injects keys as-is (lowercase),
// so support both JWT_SECRET and jwt_secret and normalize to uppercase.
// if (!process.env.JWT_SECRET && process.env.jwt_secret) {
//   process.env.JWT_SECRET = process.env.jwt_secret;
// }   
// if (!process.env.ANTHROPIC_API_KEY && process.env.anthropic_api_key) {
//   process.env.ANTHROPIC_API_KEY = process.env.anthropic_api_key;
// }

// ── C-05: Startup JWT secret guard ───────────────────────────────────────────
// Reject server start if JWT_SECRET is missing or matches any known weak value
// that may have been committed to source control.
const KNOWN_WEAK_JWT_SECRETS = ['dynatech_one_super_secret_jwt_key_2026'];
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set');
  console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}
if (KNOWN_WEAK_JWT_SECRETS.includes(process.env.JWT_SECRET)) {
  console.error('❌ FATAL: JWT_SECRET is a known compromised value — rotate it immediately');
  console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ FATAL: JWT_SECRET is too short (minimum 32 characters)');
  console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

const app                = require('./config/app');
const { sequelize }      = require('./models');
const { runMigrations }  = require('./config/migrator');
const PORT    = process.env.PORT    || 5000;
const IS_DEV  = process.env.NODE_ENV !== 'production';

(async () => {
  try {
    // ── Step 1: Verify DB connection (with retry for Cloud SQL Proxy warm-up) ──
    // The Cloud SQL Proxy sidecar may take a few seconds to start listening on
    // 127.0.0.1:5432. Retry up to 10 times with a 3s delay before giving up.
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 3000;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await sequelize.authenticate();
        console.log('✅ Database connected');
        break;
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err;
        console.log(`⏳ DB not ready (attempt ${attempt}/${MAX_RETRIES}) — retrying in ${RETRY_DELAY / 1000}s...`);
        await new Promise(res => setTimeout(res, RETRY_DELAY));
      }
    }

    // ── Step 2: Fresh-install detection ──────────────────────────────────
    //    Many base tables were created historically via sequelize.sync() and
    //    not via migrations. On a brand-new DB we need to sync first to create
    //    all tables, then mark every migration as applied so umzug doesn't
    //    try to re-add columns that already exist.
    const tables = await sequelize.getQueryInterface().showAllTables();
    const userTables = tables.filter(t => t !== 'SequelizeMeta');
    if (userTables.length === 0) {
      console.log('🆕 Fresh database detected — running full sync to create all tables...');
      // Use sequelize.sync() (not model-by-model) so Sequelize handles FK ordering
      await sequelize.sync({ force: false });
      console.log('✅ Full sync complete — marking all migrations as applied');
      const { umzug } = require('./config/migrator');
      const pending = await umzug.pending();
      for (const migration of pending) {
        await umzug.storage.logMigration({ name: migration.name });
      }
      console.log(`✅ Marked ${pending.length} migration(s) as applied (skipped on fresh install)`);
    } else {
      // ── Step 3: Auto-run pending migrations ────────────────────────────
      //    umzug checks SequelizeMeta table, runs only what hasn't run yet.
      //    Runs in BOTH dev and production.
      await runMigrations();
    }

    // ── Safe seed: insert default users if DB is empty ───────────────────
    const { seed } = require('./seeders/index');
    await seed();

    // ── SEED_ON_START: run production seed if env var is set ─────────────
    if (process.env.SEED_ON_START === 'true') {
      const { seedProduction } = require('./seeders/seed-production');
      await seedProduction();
    }

    // ── Step 3 (DEV only): Pre-sync column-type fixes ────────────────────
    //    Sequelize alter:true generates TYPE changes WITHOUT a USING clause,
    //    which PostgreSQL rejects for non-trivial casts (e.g. INTEGER → VARCHAR).
    //    Run the USING-cast here — BEFORE sync — so sync sees the right type
    //    and generates no conflicting ALTER statements.
    if (IS_DEV) {
      const preSyncFixes = [
        // sticker_type: INTEGER → VARCHAR(20)  (needs USING clause)
        `ALTER TABLE "sticker_templates"
           ALTER COLUMN "sticker_type" TYPE VARCHAR(20)
           USING "sticker_type"::text`,
      ];
      for (const sql of preSyncFixes) {
        try {
          await sequelize.query(sql);
        } catch {
          // Safe to ignore: table not yet created (sync will), or column already correct type
        }
      }
    }

    // ── Step 4 (DEV only): Sync models as safety net ─────────────────────
    //    Catches any model changes you haven't written a migration for yet.
    //    NEVER runs in production — production relies on migrations only.
    //
    //    Set SKIP_SYNC=true in .env to skip this step for faster startup.
    //    NOTE: sequelize.sync({ alter: true }) runs all DDL in parallel, which
    //    causes PostgreSQL deadlocks when 100+ tables are altered concurrently.
    //    Instead we sync each model serially in batches to avoid lock contention.
    if (IS_DEV && process.env.SKIP_SYNC !== 'true') {
      const models = Object.values(sequelize.models);
      const BATCH  = 10; // sync 10 at a time — parallel within batch, serial across batches
      for (let i = 0; i < models.length; i += BATCH) {
        await Promise.all(models.slice(i, i + BATCH).map(m => m.sync({ alter: true })));
      }
      console.log(`✅ Models synced (${models.length} models, dev safety net — alter mode)`);
    } else if (IS_DEV) {
      console.log('⏭️  Model sync skipped (SKIP_SYNC=true)');
    }

    // ── Step 5: Start export scheduler ─────────────────────────────────────
    require('./services/exportScheduler').startExportScheduler();

    // ── Step 6: Start server ──────────────────────────────────────────────
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
