'use strict';

/**
 * Migration: 20260306130000-seed-default-production-parameters
 * Seeds the production_parameters table with default parameters:
 * Scrap, Energy, Boxes, packaging, shipments
 */

const DEFAULT_PARAMS = [
  { name: 'Scrap',      type: 'number' },
  { name: 'Energy',     type: 'number' },
  { name: 'Boxes',      type: 'number' },
  { name: 'packaging',  type: 'number' },
  { name: 'shipments',  type: 'number' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const param of DEFAULT_PARAMS) {
      // Only insert if a parameter with this name doesn't already exist
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM production_parameters WHERE name = :name AND is_active = true`,
        { replacements: { name: param.name }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('production_parameters', [{
          name:       param.name,
          type:       param.type,
          formula:    null,
          ctq:        null,
          is_active:  true,
          created_by: null,
          updated_by: null,
          createdAt:  now,
          updatedAt:  now,
        }]);
      }
    }
  },

  async down(queryInterface) {
    const names = DEFAULT_PARAMS.map((p) => p.name);
    await queryInterface.bulkDelete('production_parameters', {
      name: names,
    });
  },
};
