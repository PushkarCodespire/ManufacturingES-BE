const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  PurchaseOrder,
  PurchaseOrderItem,
  Grn,
  GrnItem,
  SalesInvoice,
  DebitCreditNote,
  Payment,
  TallySyncLog,
  User,
  Vendor,
  Item,
  Integration,
} = require('../../../models');
const { notifyByRoles } = require('../../../services/notification.service');
const tallyConnector    = require('../../../services/tally-connector.service');

// ── Sync type configuration ─────────────────────────────────────────────────
const SYNC_TYPE_CONFIG = {
  supplier_po: {
    model: PurchaseOrder,
    numberField: 'po_no',
    eligibleStatuses: ['sent', 'partial', 'received'],
    direction: 'push',
    label: 'Supplier PO',
    include: [
      { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'address', 'gstin'] },
      { model: PurchaseOrderItem, as: 'Items', include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }] },
    ],
  },
  grn: {
    model: Grn,
    numberField: 'grn_no',
    eligibleStatuses: ['approved'],
    direction: 'push',
    label: 'GRN',
    include: [
      { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'address', 'gstin'] },
      { model: GrnItem, as: 'Items', include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }] },
    ],
  },
  sales_invoice: {
    model: SalesInvoice,
    numberField: 'invoice_no',
    eligibleStatuses: ['approved'],
    direction: 'push',
    label: 'Sales Invoice',
    include: [
      { model: Vendor, as: 'Customer', attributes: ['id', 'name', 'address', 'gstin'] },
    ],
  },
  debit_credit: {
    model: DebitCreditNote,
    numberField: 'note_no',
    eligibleStatuses: ['approved'],
    direction: 'push',
    label: 'Debit/Credit Note',
    include: [
      { model: Vendor, as: 'Vendor', attributes: ['id', 'name', 'address', 'gstin'] },
      { model: Vendor, as: 'Customer', attributes: ['id', 'name', 'address', 'gstin'] },
    ],
  },
  payment: {
    model: Payment,
    numberField: 'payment_no',
    eligibleStatuses: ['pending', 'completed'],
    direction: 'pull',
    label: 'Payment',
    include: [
      { model: Vendor, as: 'Vendor', attributes: ['id', 'name'] },
      { model: Vendor, as: 'Customer', attributes: ['id', 'name'] },
    ],
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
    else result.pending += count;
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

    // Include tally config status for frontend
    const tallyConfig = await tallyConnector.getTallyConfig();

    return res.json({
      success: true,
      data: {
        summary: {
          total_synced: totalSynced,
          total_pending: totalPending,
          total_errors: totalErrors,
        },
        types,
        tally: {
          is_enabled: tallyConfig?.is_enabled || false,
          mock_mode:  tallyConfig?.mock_mode || false,
          host:       tallyConfig?.host || '',
          port:       tallyConfig?.port || 9000,
        },
      },
    });
  } catch (err) {
    console.error('[getSyncDashboard]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /tally-sync/trigger ────────────────────────────────────────────────
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

    // Get Tally config
    const tallyConfig = await tallyConnector.getTallyConfig();
    if (!tallyConfig || !tallyConfig.is_enabled) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tally integration is not enabled. Go to Masters → Integrations → Tally to configure and enable it.',
      });
    }

    // Fetch pending records with associations for XML building
    const pendingRecords = await config.model.findAll({
      where: {
        tally_sync_status: 'pending',
        status: { [Op.in]: config.eligibleStatuses },
      },
      include: config.include || [],
      transaction: t,
    });

    if (pendingRecords.length === 0) {
      await t.commit();
      return res.json({
        success: true,
        data: { sync_type, records_synced: 0, records_failed: 0, error_count: 0 },
        message: `No pending ${config.label} records to sync`,
      });
    }

    // Push or pull via Tally connector
    let syncedCount = 0;
    let failedCount = 0;
    const errorMessages = [];

    if (config.direction === 'push') {
      const results = await tallyConnector.pushRecords(sync_type, pendingRecords, tallyConfig);

      for (const result of results) {
        if (result.success) {
          await config.model.update(
            { tally_sync_status: 'synced', tally_sync_at: new Date() },
            { where: { id: result.recordId }, transaction: t },
          );
          syncedCount++;
        } else {
          await config.model.update(
            { tally_sync_status: 'error' },
            { where: { id: result.recordId }, transaction: t },
          );
          failedCount++;
          errorMessages.push(`${result.recordNumber}: ${result.error}`);
        }
      }
    } else {
      // Pull (payment) — query Tally for payment vouchers
      const pullResult = await tallyConnector.pullPayments(tallyConfig);

      if (!pullResult.success) {
        failedCount = pendingRecords.length;
        errorMessages.push(pullResult.error || 'Failed to pull from Tally');
      } else {
        // Match Tally vouchers to local Payment records
        for (const record of pendingRecords) {
          const match = pullResult.vouchers.find(v =>
            v.VOUCHERNUMBER === record.payment_no ||
            v.VOUCHERNUMBER === record.ref_no
          );
          if (match) {
            await config.model.update(
              { tally_sync_status: 'synced', tally_sync_at: new Date() },
              { where: { id: record.id }, transaction: t },
            );
            syncedCount++;
          } else {
            // No match in Tally — mark as synced if mock mode, keep pending otherwise
            if (tallyConfig.mock_mode) {
              await config.model.update(
                { tally_sync_status: 'synced', tally_sync_at: new Date() },
                { where: { id: record.id }, transaction: t },
              );
              syncedCount++;
            }
            // In real mode, unmatched records stay pending (not an error)
          }
        }
      }
    }

    // Log the sync action
    const logStatus = failedCount > 0 && syncedCount === 0 ? 'error' : (failedCount > 0 ? 'success' : 'success');
    await TallySyncLog.create({
      sync_type,
      record_id: null,
      record_number: null,
      direction: config.direction,
      status: logStatus,
      records_affected: syncedCount,
      error_message: errorMessages.length > 0 ? errorMessages.join(' | ') : null,
      synced_by: req.user?.id || null,
    }, { transaction: t });

    await t.commit();

    // L-05: Notify accounts_manager if any records are in error state
    const errorCount = await config.model.count({ where: { tally_sync_status: 'error' } });
    if (errorCount > 0) {
      notifyByRoles(
        ['accounts_manager'],
        'TALLY_SYNC_ERRORS',
        `Tally Sync: ${errorCount} ${config.label} record(s) in error state`,
        `After syncing, ${errorCount} ${config.label} record(s) are still marked as sync error. ` +
          'Use Retry Failed to re-queue them.',
      ).catch((e) => console.warn('[triggerSync] notification error:', e.message));
    }

    const modeLabel = tallyConfig.mock_mode ? ' (mock mode)' : '';
    return res.json({
      success: true,
      data: { sync_type, records_synced: syncedCount, records_failed: failedCount, error_count: errorCount },
      message: syncedCount > 0
        ? `Synced ${syncedCount} ${config.label} record(s) to Tally${modeLabel}${failedCount > 0 ? `, ${failedCount} failed` : ''}`
        : `No ${config.label} records were synced${modeLabel}`,
    });
  } catch (err) {
    await t.rollback();
    console.error('[triggerSync]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /tally-sync/test-connection ────────────────────────────────────────
const testTallyConnection = async (req, res) => {
  try {
    const tallyConfig = await tallyConnector.getTallyConfig();
    if (!tallyConfig) {
      return res.status(400).json({
        success: false,
        message: 'Tally integration not configured. Go to Masters → Integrations → Tally.',
      });
    }

    if (!tallyConfig.host || !tallyConfig.port) {
      return res.status(400).json({
        success: false,
        message: 'Tally host and port must be configured before testing.',
      });
    }

    const result = await tallyConnector.testConnection(tallyConfig);

    // Update Integration record
    await Integration.update(
      {
        last_tested_at: new Date(),
        last_test_status: result.success ? 'success' : 'error',
      },
      { where: { slug: 'tally' } },
    );

    return res.json({
      success: result.success,
      data: {
        companies: result.companies || [],
        mock_mode: tallyConfig.mock_mode,
      },
      message: result.message,
    });
  } catch (err) {
    console.error('[testTallyConnection]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── POST /tally-sync/preview ────────────────────────────────────────────────
// Returns the XML that WOULD be sent to Tally without actually sending it.
const previewSyncXml = async (req, res) => {
  try {
    const { sync_type } = req.body;
    const config = SYNC_TYPE_CONFIG[sync_type];

    if (!config) {
      return res.status(400).json({
        success: false,
        message: `Invalid sync_type. Must be one of: ${Object.keys(SYNC_TYPE_CONFIG).join(', ')}`,
      });
    }

    const tallyConfig = await tallyConnector.getTallyConfig();
    if (!tallyConfig) {
      return res.status(400).json({
        success: false,
        message: 'Tally integration not configured.',
      });
    }

    if (config.direction === 'pull') {
      // Show the query XML for pull
      const xml = tallyConnector.buildPaymentQueryXml(tallyConfig);
      return res.json({
        success: true,
        data: { xml, record_count: 0, direction: 'pull', sync_type },
        message: 'Payment pull query XML preview',
      });
    }

    // Fetch a few pending records for preview (limit 3)
    const records = await config.model.findAll({
      where: {
        tally_sync_status: 'pending',
        status: { [Op.in]: config.eligibleStatuses },
      },
      include: config.include || [],
      limit: 3,
    });

    if (records.length === 0) {
      return res.json({
        success: true,
        data: { xml: '<!-- No pending records to preview -->', record_count: 0, direction: 'push', sync_type },
        message: 'No pending records found for preview',
      });
    }

    // Build XML for the first record as a sample
    const xml = tallyConnector.buildVoucherXml(sync_type, records[0], tallyConfig);

    return res.json({
      success: true,
      data: { xml, record_count: records.length, direction: 'push', sync_type },
      message: `Preview of ${config.label} XML (showing 1 of ${records.length} pending)`,
    });
  } catch (err) {
    console.error('[previewSyncXml]', err);
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

// ── POST /tally-sync/retry ──────────────────────────────────────────────────
const retryFailed = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { sync_type } = req.body;

    const typesToRetry = sync_type
      ? [sync_type]
      : Object.keys(SYNC_TYPE_CONFIG);

    if (sync_type && !SYNC_TYPE_CONFIG[sync_type]) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid sync_type. Must be one of: ${Object.keys(SYNC_TYPE_CONFIG).join(', ')}`,
      });
    }

    const results = {};
    let totalReset = 0;

    for (const type of typesToRetry) {
      const config = SYNC_TYPE_CONFIG[type];
      const [count] = await config.model.update(
        { tally_sync_status: 'pending', tally_sync_at: null },
        { where: { tally_sync_status: 'error' }, transaction: t },
      );
      results[type] = count;
      totalReset += count;

      if (count > 0) {
        await TallySyncLog.create({
          sync_type:        type,
          record_id:        null,
          record_number:    null,
          direction:        config.direction,
          status:           'pending',
          records_affected: count,
          error_message:    `Retry triggered — ${count} record(s) reset to pending by ${req.user?.name || 'system'}`,
          synced_by:        req.user?.id || null,
        }, { transaction: t });
      }
    }

    await t.commit();

    return res.json({
      success: true,
      data:    { reset_by_type: results, total_reset: totalReset },
      message: totalReset > 0
        ? `${totalReset} error record(s) re-queued for sync`
        : 'No error records found to retry',
    });
  } catch (err) {
    await t.rollback();
    console.error('[retryFailed]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

// ── GET /tally-sync/failed ──────────────────────────────────────────────────
const getFailedRecords = async (req, res) => {
  try {
    const summary = {};
    let totalFailed = 0;

    for (const [type, config] of Object.entries(SYNC_TYPE_CONFIG)) {
      const errorCount = await config.model.count({
        where: { tally_sync_status: 'error' },
      });
      summary[type] = { label: config.label, error_count: errorCount };
      totalFailed += errorCount;
    }

    if (totalFailed > 0) {
      const typeList = Object.entries(summary)
        .filter(([, v]) => v.error_count > 0)
        .map(([k, v]) => `${v.label}: ${v.error_count}`)
        .join(', ');

      notifyByRoles(
        ['accounts_manager'],
        'TALLY_SYNC_ERRORS',
        `Tally Sync: ${totalFailed} record(s) failed`,
        `${totalFailed} record(s) are stuck in sync error state and require retry. Breakdown: ${typeList}.`,
      ).catch((e) => console.warn('[getFailedRecords] notification error:', e.message));
    }

    return res.json({
      success: true,
      data:    { total_failed: totalFailed, by_type: summary },
      message: totalFailed > 0
        ? `${totalFailed} record(s) stuck in error state — use Retry Failed to re-queue`
        : 'No failed records',
    });
  } catch (err) {
    console.error('[getFailedRecords]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = {
  getSyncDashboard,
  triggerSync,
  testTallyConnection,
  previewSyncXml,
  getSyncLogs,
  retryFailed,
  getFailedRecords,
};
