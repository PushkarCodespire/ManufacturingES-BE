'use strict';

/**
 * C-02 fix — JobCard status column: VARCHAR(20) → ENUM('open','closed','cancelled')
 *
 * Before this migration the column was a free-form string. Only 'open' was a
 * documented value; 'closed' was written by the close controller but not
 * declared anywhere, making filtering and reporting unreliable.
 *
 * This migration:
 *   1. Creates the enum type  enum_job_cards_status
 *   2. Alters the column to use it (casting existing values)
 *
 * Down reverses the change by casting back to VARCHAR and dropping the type.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create the PostgreSQL ENUM type (name Sequelize expects)
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_job_cards_status') THEN
          CREATE TYPE "enum_job_cards_status" AS ENUM ('open', 'closed', 'cancelled');
        END IF;
      END
      $$;
    `);

    // 2. Drop the column default first — PostgreSQL cannot cast a string default
    //    ('open') automatically when changing a column to an ENUM type.
    await queryInterface.sequelize.query(`
      ALTER TABLE job_cards ALTER COLUMN status DROP DEFAULT;
    `);

    // 3. Cast the column — any legacy rows that somehow have an unknown value
    //    default to 'open' via the CASE expression so the cast never fails.
    await queryInterface.sequelize.query(`
      ALTER TABLE job_cards
        ALTER COLUMN status
        TYPE "enum_job_cards_status"
        USING (
          CASE status
            WHEN 'closed'    THEN 'closed'::"enum_job_cards_status"
            WHEN 'cancelled' THEN 'cancelled'::"enum_job_cards_status"
            ELSE 'open'::"enum_job_cards_status"
          END
        );
    `);

    // 4. Restore the default using the enum type
    await queryInterface.sequelize.query(`
      ALTER TABLE job_cards
        ALTER COLUMN status SET DEFAULT 'open'::"enum_job_cards_status";
    `);
  },

  async down(queryInterface, Sequelize) {
    // 1. Cast back to VARCHAR
    await queryInterface.sequelize.query(`
      ALTER TABLE job_cards
        ALTER COLUMN status
        TYPE VARCHAR(20)
        USING status::VARCHAR;
    `);

    // 2. Drop the ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_job_cards_status";
    `);
  },
};
