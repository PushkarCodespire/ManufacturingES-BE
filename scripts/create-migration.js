/**
 * Dynatech ONE — Migration File Generator
 *
 * Usage:
 *   npm run migration:create -- MigrationName
 *
 * Examples:
 *   npm run migration:create -- AddProfilePicToUsers
 *   npm run migration:create -- CreateProductsTable
 *   npm run migration:create -- DropPhoneFromUsers
 *
 * The script creates a timestamped migration file inside /migrations/
 * with a ready-to-fill template (up + down functions).
 */

const fs   = require('fs');
const path = require('path');

const name = process.argv[2];

if (!name) {
  console.error('\n❌  Please provide a migration name.');
  console.error('   Usage: npm run migration:create -- MigrationName\n');
  process.exit(1);
}

// Timestamp: YYYYMMDDHHMMSS
const now       = new Date();
const pad       = (n) => String(n).padStart(2, '0');
const timestamp = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  pad(now.getHours()),
  pad(now.getMinutes()),
  pad(now.getSeconds()),
].join('');

const filename = `${timestamp}-${name}.js`;
const filePath = path.join(__dirname, '../migrations', filename);

const template = `'use strict';

/**
 * Migration: ${name}
 * Generated: ${now.toISOString()}
 *
 * Docs:
 *   addColumn    → queryInterface.addColumn('table', 'column', { type: ... })
 *   removeColumn → queryInterface.removeColumn('table', 'column')
 *   changeColumn → queryInterface.changeColumn('table', 'column', { type: ... })
 *   addIndex     → queryInterface.addIndex('table', ['column'], { name: '...' })
 *   createTable  → queryInterface.createTable('table', { id: {...}, ... })
 *   dropTable    → queryInterface.dropTable('table')
 *   renameColumn → queryInterface.renameColumn('table', 'old', 'new')
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Write your changes here ──────────────────────────────────────────────

    // Example — add a column:
    // await queryInterface.addColumn('users', 'avatar_url', {
    //   type:      Sequelize.DataTypes.STRING(500),
    //   allowNull: true,
    // });

    // Example — create a new table:
    // await queryInterface.createTable('products', {
    //   id:        { type: Sequelize.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    //   name:      { type: Sequelize.DataTypes.STRING(150), allowNull: false },
    //   createdAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    //   updatedAt: { type: Sequelize.DataTypes.DATE, allowNull: false },
    // });
  },

  async down(queryInterface, Sequelize) {
    // ── Rollback logic (reverse of up) ───────────────────────────────────────

    // Example — remove the column added in up():
    // await queryInterface.removeColumn('users', 'avatar_url');

    // Example — drop the table created in up():
    // await queryInterface.dropTable('products');
  },
};
`;

fs.writeFileSync(filePath, template, 'utf8');

console.log(`\n✅ Migration created:`);
console.log(`   migrations/${filename}\n`);
console.log(`Next steps:`);
console.log(`  1. Open the file and fill in the up() and down() functions`);
console.log(`  2. Restart the server — it will run automatically\n`);
