/**
 * iqcCascade.service.js
 *
 * L-01: IQC rejection cascade extracted from iqcInspection.controller.js into a
 * dedicated service so the business logic lives in one place, can be unit-tested
 * independently, and can be reused by other modules (e.g. LQC, OQC) in the future.
 *
 * Encapsulates: CAPA creation → NCR creation → SCAR creation →
 *               inventory quarantine → FK back-links → notifications.
 */

'use strict';

const { Op } = require('sequelize');
const {
  Capa, Ncr, Scar, Inventory, InventoryTxn,
} = require('../models');
const { notifyByRoles } = require('./notification.service');

// ── Shared auto-number helper (same pattern as controllers) ──────────────────
async function nextAutoNo(Model, field, prefix) {
  const year = new Date().getFullYear();
  const full = `${prefix}-${year}-`;
  const last = await Model.findOne({
    where: { [field]: { [Op.like]: `${full}%` } },
    order: [[field, 'DESC']],
  });
  const seq = last ? parseInt(last[field].split('-').pop(), 10) + 1 : 1;
  return `${full}${String(seq).padStart(4, '0')}`;
}

/**
 * Execute the full IQC rejection cascade.
 *
 * Pre-condition: `record` must be an IqcInspection instance with the following
 * associations already loaded: Item, Vendor, Grn (includes warehouse_id).
 *
 * @param {object} record  - Sequelize IqcInspection instance with includes
 * @param {number} userId  - req.user.id of the actor triggering the cascade
 * @returns {Promise<object>} result map: { capa_id, capa_no, ncr_id, ncr_no,
 *                                          scar_id?, scar_no?, quarantine_qty }
 */
async function executeCascade(record, userId) {
  const itemName   = record.Item?.name   || 'Unknown Item';
  const vendorName = record.Vendor?.name || 'Unknown Vendor';
  const rejQty     = parseFloat(record.qty_rejected || 0);
  const result     = {};

  // ── 1. Create CAPA ──────────────────────────────────────────────────────────
  const capa_no = await nextAutoNo(Capa, 'capa_no', 'CAPA');
  const capa = await Capa.create({
    capa_no,
    source_type:   'iqc',
    source_id:     record.id,
    problem_title: `IQC Rejection — ${itemName} — ${record.inspection_no}`,
    problem_desc:  [
      `Incoming inspection ${record.inspection_no} resulted in ${record.result.toUpperCase()}.`,
      `Vendor: ${vendorName}`,
      `Batch: ${record.batch_no || 'N/A'}`,
      `Qty Rejected: ${rejQty}`,
      `Inspection Date: ${record.inspection_date}`,
    ].join('\n'),
    status:     'draft',
    created_by: userId,
  });
  result.capa_id = capa.id;
  result.capa_no = capa.capa_no;

  // ── 2. Create NCR ───────────────────────────────────────────────────────────
  const ncr_no = await nextAutoNo(Ncr, 'ncr_no', 'NCR');
  const ncr = await Ncr.create({
    ncr_no,
    ncr_type:       'material',
    item_id:        record.item_id,
    lot_no:         record.batch_no || null,
    qty_affected:   rejQty,
    defect_desc:    [
      `IQC rejection for ${itemName} from vendor ${vendorName}.`,
      `Inspection: ${record.inspection_no}`,
      `Result: ${record.result}`,
      `Notes: ${record.notes || 'N/A'}`,
    ].join('\n'),
    location_found: 'iqc',
    status:         'raised',
    raised_by:      userId,
    created_by:     userId,
  });
  result.ncr_id = ncr.id;
  result.ncr_no = ncr.ncr_no;

  // ── 3. Create SCAR (vendor-linked inspections only) ─────────────────────────
  if (record.vendor_id) {
    const scar_no = await nextAutoNo(Scar, 'scar_no', 'SCAR');
    const responseDue = new Date();
    responseDue.setDate(responseDue.getDate() + 15);

    const scar = await Scar.create({
      scar_no,
      vendor_id:              record.vendor_id,
      source_type:            'iqc',
      source_id:              record.id,
      defect_desc:            `IQC rejection: ${itemName} — ${record.inspection_no}. ${record.notes || ''}`.trim(),
      affected_qty:           rejQty,
      severity:               'major',
      required_response_date: responseDue.toISOString().split('T')[0],
      status:                 'created',
      created_by:             userId,
    });
    result.scar_id = scar.id;
    result.scar_no = scar.scar_no;
    await record.update({ scar_id: scar.id });
  }

  // ── 4. Quarantine inventory (deduct rejected qty) ────────────────────────────
  result.quarantine_qty = 0;
  if (rejQty > 0 && record.item_id && record.Grn?.warehouse_id) {
    try {
      const inv = await Inventory.findOne({
        where: { item_id: record.item_id, warehouse_id: record.Grn.warehouse_id },
      });
      if (inv) {
        const qtyBefore = parseFloat(inv.qty_on_hand);
        const qtyChange = -rejQty;
        const qtyAfter  = Math.max(0, qtyBefore + qtyChange);

        await inv.update({ qty_on_hand: qtyAfter, last_txn_at: new Date() });
        await InventoryTxn.create({
          item_id:      record.item_id,
          warehouse_id: record.Grn.warehouse_id,
          txn_type:     'quarantine_out',
          ref_type:     'iqc',
          ref_id:       record.id,
          ref_no:       record.inspection_no,
          qty_before:   qtyBefore,
          qty_change:   qtyChange,
          qty_after:    qtyAfter,
          created_by:   userId,
        });
        result.quarantine_qty = rejQty;
      }
    } catch (invErr) {
      console.warn('[iqcCascade.service] Quarantine error (non-fatal):', invErr.message);
    }
  }

  // ── 5. Back-link CAPA and NCR on the inspection record ──────────────────────
  await record.update({ capa_id: capa.id, ncr_id: ncr.id });

  // ── 6. Notify stakeholders ───────────────────────────────────────────────────
  await notifyByRoles(
    ['quality_manager', 'procurement_manager'],
    'IQC_REJECTION',
    `IQC Rejection Cascade: ${record.inspection_no}`,
    `Full cascade triggered for ${itemName} — CAPA ${capa.capa_no}, NCR ${ncr.ncr_no}` +
      `${result.scar_no ? `, SCAR ${result.scar_no}` : ''}. Qty quarantined: ${result.quarantine_qty}.`,
  );
  if (result.quarantine_qty > 0) {
    await notifyByRoles(
      ['store_manager'],
      'IQC_QUARANTINE',
      `Inventory quarantined: ${itemName}`,
      `${result.quarantine_qty} units of ${itemName} quarantined from warehouse due to IQC rejection ${record.inspection_no}.`,
    );
  }

  return result;
}

module.exports = { executeCascade };
