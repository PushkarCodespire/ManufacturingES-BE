'use strict';

/**
 * Migration: Change sticker_templates.sticker_type from INTEGER → VARCHAR(20)
 *
 * Idempotent: checks the current column data_type before acting.
 * Safe to run whether the table exists or not, and whether the column
 * has already been converted or not.
 */

module.exports = {
  async up(queryInterface) {
    // Check current column type — skip if table/column doesn't exist or is already VARCHAR
    const [rows] = await queryInterface.sequelize.query(`
      SELECT data_type
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'sticker_templates'
         AND column_name  = 'sticker_type'
    `);

    if (!rows.length) {
      // Table doesn't exist yet — sync will create it with the correct type
      return;
    }

    if (rows[0].data_type !== 'integer') {
      // Already converted — nothing to do
      return;
    }

    // Cast INTEGER → VARCHAR(20) using USING clause (required by PostgreSQL)
    await queryInterface.sequelize.query(`
      ALTER TABLE "sticker_templates"
        ALTER COLUMN "sticker_type" TYPE VARCHAR(20)
        USING "sticker_type"::text
    `);

    // Reset any old numeric-derived values to the canonical new default
    await queryInterface.sequelize.query(`
      UPDATE "sticker_templates"
         SET "sticker_type" = 'QR Code'
       WHERE "sticker_type" NOT IN ('QR Code', 'Barcode')
    `);

    // Update column default
    await queryInterface.sequelize.query(`
      ALTER TABLE "sticker_templates"
        ALTER COLUMN "sticker_type" SET DEFAULT 'QR Code'
    `);
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT data_type
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'sticker_templates'
         AND column_name  = 'sticker_type'
    `);

    if (!rows.length || rows[0].data_type === 'integer') return;

    await queryInterface.sequelize.query(`
      UPDATE "sticker_templates" SET "sticker_type" = '1'
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "sticker_templates"
        ALTER COLUMN "sticker_type" TYPE INTEGER
        USING "sticker_type"::integer
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "sticker_templates"
        ALTER COLUMN "sticker_type" SET DEFAULT 1
    `);
  },
};
