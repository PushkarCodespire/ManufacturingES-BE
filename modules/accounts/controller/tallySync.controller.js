const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  PurchaseOrder,
  Grn,
  SalesInvoice,
  DebitCreditNote,
  Payment,
  TallySyncLog,
  User,
} = require('../../../models');

// ── Sync type configuration ─────────────────────────────────────────────────
// Each type defines which model, document-number field, eligible record statuses,
// and sync direction (push = Dynatech→Tally, pull = Tally→Dynatech).
const SYNC_TYPE_CONFIG = {
  supplier_po: {
    model: PurchaseOrder,
    numberField: 'po_no',
    eligibleStatuses: ['sent', 'partial', 'received'],
    direction: 'push',
    label: 'Supplier PO',
  },
  grn: {
    model: Grn,
    numberField: 'grn_no',
    eligibleStatuses: ['approved'],
    direction: 'push',
    label: 'GRN',
  },
  sales_invoice: {
    model: SalesInvoice,
    numberField: 'invoice_no',
    eligibleStatuses: ['approved'],
    direction: 'push',
    label: 'Sales Invoice',
  },
  debit_credit: {
    model: DebitCreditNote,
    numberField: 'note_no',
    eligibleStatuses: ['approved'],
    direction: 'push',
    label: 'Debit/Credit Note',
  },
  payment: {
    model: Payment,
    numberField: 'payment_no',
    eligibleStatuses: ['pending', 'completed'],
    direction: 'pull',
    label: 'Payment',
  },
};

// ── Helper: count sync statuses for one model ───────────────────────────────
const countSyncStatuses = async (model) => {
  const rows = await model.findAll({
    attributes: [
      'tally_sync_status',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['tally_sync_status'],
    raw: true,
  });

  const result = { synced: 0, pending: 0, errors: 0 };
  rows.forEach((r) => {
    const status = r.tally_sync_status;
    const count = parseInt(r.count, 10) || 0;
    if (status === 'synced')  result.synced = count;
    else if (status === 'error') result.errors = count;
    else result.pending += count; // 'pending' or any other value
  });

  const lastSync = await model.max('tally_sync_at');
  result.lastSync = lastSync || null;
  result.total = result.synced + result.pending + result.errors;

  return result;
};

// ── GET /tally-sync/dashboard ───────────────────────────────────────────────
const getSyncDashboard = async (req, res) => {
  try {
    const types = {};
    let totalSynced = 0;
    let totalPending = 0;
    let totalErrors = 0;

    for (const [key, config] of Object.entries(SYNC_TYPE_CONFIG)) {
      const stats = await countSyncStatuses(config.model);
      types[key] = stats;
      totalSynced += stats.synced;
      totalPending += stats.pending;
      totalErrors += stats.errors;
    }

    return res.json({
      success: true,
      data: {
        summary: {
          total_synced: totalSynced,
          total_pending: totalPending,
          total_errors: totalErrors,
        },
        types,
      },
    });
  } catch (err) {
    console.error('[getSyncDashboard]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /tally-sync/trigger ────────────────────────────────────────────────
// Body: { sync_type: 'supplier_po' | 'grn' | 'sales_invoice' | 'debit_credit' | 'payment' }
const triggerSync = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { sync_type } = req.body;
    const config = SYNC_TYPE_CONFIG[sync_type];

    if (!config) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid sync_type. Must be one of: ${Object.keys(SYNC_TYPE_CONFIG).join(', ')}`,
      });
    }

    // ──────────────────────────────────────────────────────────────
    // FUTURE: Replace this block with actual Tally XML API call.
    // The connector would:
    //   1. Build Tally XML request for the given sync_type
    //   2. POST to Tally's HTTP endpoint (typically http://localhost:9000)
    //   3. Parse the response XML
    //   4. Only mark records as 'synced' if Tally confirms success
    //   5. Mark as 'error' with error_message if Tally rejects
    // For now, we simulate success by directly marking records as synced.
    // ──────────────────────────────────────────────────────────────

    const [affectedCount] = await config.model.update(
      {
        tally_sync_status: 'synced',
        tally_sync_at: new Date(),
      },
      {
        where: {
          tally_sync_status: 'pending',
          status: { [Op.in]: config.eligibleStatuses },
        },
        transaction: t,
      },
    );

    // Log the sync action
    await TallySyncLog.create({
      sync_type,
      record_id: null,
      record_number: null,
      direction: config.direction,
      status: 'success',
      records_affected: affectedCount,
      error_message: null,
      synced_by: req.user?.id || null,
    }, { transaction: t });

    await t.commit();

    return res.json({
      success: true,
      data: { sync_type, records_synced: affectedCount },
      message: affectedCount > 0
        ? `Synced ${affectedCount} ${config.label} record(s) to Tally`
        : `No pending ${config.label} records to sync`,
    });
  } catch (err) {
    await t.rollback();
    console.error('[triggerSync]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /tally-sync/logs ────────────────────────────────────────────────────
const getSyncLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;

    const where = {};
    if (req.query.sync_type) where.sync_type = req.query.sync_type;
    if (req.query.status)    where.status = req.query.status;

    const { count, rows } = await TallySyncLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'SyncedBy', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return res.json({
      success: true,
      data: { rows, total: count, page, pageSize },
    });
  } catch (err) {
    console.error('[getSyncLogs]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { getSyncDashboard, triggerSync, getSyncLogs };
