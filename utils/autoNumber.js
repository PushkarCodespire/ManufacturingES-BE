/**
 * Shared auto-number generator for all modules.
 *
 * Replaces dozens of copy-pasted `nextXxxNo()` helpers scattered across
 * controllers with a single reusable function.
 *
 * Usage:
 *   const { generateAutoNumber } = require('../utils/autoNumber');   // adjust path
 *
 *   // Simple (most common):
 *   const wo_no = await generateAutoNumber(WorkOrder, 'wo_no', 'WO');
 *   // → "WO-2026-0001"
 *
 *   // With extra where clause (e.g. filtered by type):
 *   const no = await generateAutoNumber(SubcontractChallan, 'challan_no', 'OC', {
 *     extraWhere: { type: 'outward' },
 *   });
 *
 *   // With a multi-segment prefix that already contains year:
 *   const mwo = await generateAutoNumber(MaintenanceWorkOrder, 'wo_number', 'MWO-C', {
 *     prefixHasYear: false,   // default true — set false to skip auto-appending year
 *   });
 *   // → "MWO-C-0001" (no year injected)
 *
 *   // Order by id instead of the field itself:
 *   const code = await generateAutoNumber(Equipment, 'equipment_code', 'EQP', {
 *     orderBy: 'id',
 *   });
 */

'use strict';

const { Op } = require('sequelize');

/**
 * Generate the next sequential document number.
 *
 * @param {import('sequelize').Model} Model       Sequelize model class
 * @param {string}                    fieldName   Column that stores the number
 * @param {string}                    prefix      Code prefix WITHOUT year (e.g. "WO", "PO")
 * @param {object}                    [opts]
 * @param {number}                    [opts.padLength=4]     Zero-pad width
 * @param {object}                    [opts.extraWhere]      Additional WHERE conditions
 * @param {string}                    [opts.orderBy]         Column to ORDER BY (default: fieldName)
 * @param {boolean}                   [opts.prefixHasYear=true] Whether to insert "-YEAR-" between prefix and seq
 * @returns {Promise<string>}         e.g. "WO-2026-0001"
 */
async function generateAutoNumber(Model, fieldName, prefix, opts = {}) {
  const padLength    = opts.padLength    || 4;
  const orderBy      = opts.orderBy      || fieldName;
  const prefixHasYear = opts.prefixHasYear !== false; // default true

  const year       = new Date().getFullYear();
  const fullPrefix = prefixHasYear ? `${prefix}-${year}-` : `${prefix}-`;

  const where = {
    [fieldName]: { [Op.like]: `${fullPrefix}%` },
    ...opts.extraWhere,
  };

  const last = await Model.findOne({
    where,
    order: [[orderBy, 'DESC']],
  });

  const seq = last
    ? parseInt(last[fieldName].split('-').pop(), 10) + 1
    : 1;

  return `${fullPrefix}${String(seq).padStart(padLength, '0')}`;
}

module.exports = { generateAutoNumber };
