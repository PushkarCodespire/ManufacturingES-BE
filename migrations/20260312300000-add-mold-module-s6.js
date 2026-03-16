'use strict';

/**
 * Mold Management — Sprint 6 Migration
 * Adds 3 tables for AI Predictive Life (MOL-013) and Mold Selection (MOL-014):
 *   - mold_ai_predictions       : stores each prediction run per mold
 *   - mold_prediction_feedback  : supervisor feedback loop for model improvement
 *   - mold_reservations         : mold reservations against Work Orders
 *
 * Uses raw SQL with IF NOT EXISTS / DO $$ guards throughout so the migration
 * is fully idempotent — safe to re-run even if tables/indexes already exist
 * from a previous partial run.
 */

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // ── 1. mold_ai_predictions ───────────────────────────────────────────────
    await q(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_mold_ai_predictions_confidence_level') THEN
        CREATE TYPE "enum_mold_ai_predictions_confidence_level" AS ENUM ('high', 'medium', 'low');
      END IF;
    END $$;`);

    await q(`CREATE TABLE IF NOT EXISTS "mold_ai_predictions" (
      "id"                         SERIAL PRIMARY KEY,
      "mold_id"                    INTEGER NOT NULL REFERENCES "molds"("id") ON UPDATE CASCADE ON DELETE CASCADE,
      "rated_remaining_shots"      INTEGER,
      "predicted_remaining_shots"  INTEGER,
      "confidence_level"           "enum_mold_ai_predictions_confidence_level" NOT NULL DEFAULT 'low',
      "contributing_signals"       JSONB NOT NULL DEFAULT '[]',
      "recommended_action"         TEXT,
      "predicted_replacement_date" DATE,
      "model_version"              VARCHAR(20) NOT NULL DEFAULT 'v1.0',
      "generated_at"               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );`);

    await q(`CREATE INDEX IF NOT EXISTS "mold_ai_predictions_mold_id"      ON "mold_ai_predictions" ("mold_id")`);
    await q(`CREATE INDEX IF NOT EXISTS "mold_ai_predictions_generated_at" ON "mold_ai_predictions" ("generated_at")`);

    // ── 2. mold_prediction_feedback ─────────────────────────────────────────
    await q(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_mold_prediction_feedback_feedback_type') THEN
        CREATE TYPE "enum_mold_prediction_feedback_feedback_type" AS ENUM ('accurate', 'too_early', 'too_late');
      END IF;
    END $$;`);

    await q(`CREATE TABLE IF NOT EXISTS "mold_prediction_feedback" (
      "id"               SERIAL PRIMARY KEY,
      "prediction_id"    INTEGER NOT NULL REFERENCES "mold_ai_predictions"("id") ON UPDATE CASCADE ON DELETE CASCADE,
      "mold_id"          INTEGER NOT NULL REFERENCES "molds"("id")               ON UPDATE CASCADE ON DELETE CASCADE,
      "feedback_type"    "enum_mold_prediction_feedback_feedback_type" NOT NULL,
      "supervisor_notes" TEXT,
      "given_by"         INTEGER NOT NULL REFERENCES "users"("id")               ON UPDATE CASCADE ON DELETE RESTRICT,
      "given_at"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );`);

    await q(`CREATE INDEX IF NOT EXISTS "mold_prediction_feedback_prediction_id" ON "mold_prediction_feedback" ("prediction_id")`);
    await q(`CREATE INDEX IF NOT EXISTS "mold_prediction_feedback_mold_id"       ON "mold_prediction_feedback" ("mold_id")`);

    // ── 3. mold_reservations ─────────────────────────────────────────────────
    await q(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_mold_reservations_status') THEN
        CREATE TYPE "enum_mold_reservations_status" AS ENUM ('active', 'released', 'cancelled');
      END IF;
    END $$;`);

    await q(`CREATE TABLE IF NOT EXISTS "mold_reservations" (
      "id"              SERIAL PRIMARY KEY,
      "mold_id"         INTEGER NOT NULL REFERENCES "molds"("id")       ON UPDATE CASCADE ON DELETE CASCADE,
      "work_order_id"   UUID    NOT NULL REFERENCES "work_orders"("id") ON UPDATE CASCADE ON DELETE CASCADE,
      "reserved_by"     INTEGER NOT NULL REFERENCES "users"("id")       ON UPDATE CASCADE ON DELETE RESTRICT,
      "reserved_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "released_at"     TIMESTAMP WITH TIME ZONE,
      "status"          "enum_mold_reservations_status" NOT NULL DEFAULT 'active',
      "override_reason" TEXT,
      "created_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updated_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );`);

    await q(`CREATE INDEX IF NOT EXISTS "mold_reservations_mold_id_status" ON "mold_reservations" ("mold_id", "status")`);
    await q(`CREATE INDEX IF NOT EXISTS "mold_reservations_work_order_id"  ON "mold_reservations" ("work_order_id")`);
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`DROP TABLE IF EXISTS "mold_reservations"`);
    await q(`DROP TABLE IF EXISTS "mold_prediction_feedback"`);
    await q(`DROP TABLE IF EXISTS "mold_ai_predictions"`);
    await q(`DROP TYPE IF EXISTS "enum_mold_ai_predictions_confidence_level"`);
    await q(`DROP TYPE IF EXISTS "enum_mold_prediction_feedback_feedback_type"`);
    await q(`DROP TYPE IF EXISTS "enum_mold_reservations_status"`);
  },
};
