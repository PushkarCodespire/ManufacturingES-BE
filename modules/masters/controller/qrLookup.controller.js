const { WorkOrder, JobCard, Grn, PurchaseOrder, Instrument, Mold, Item } = require('../../../models');

// Type → { model, field, path, labelFn }
const TYPE_MAP = {
  WO:   { model: WorkOrder,     field: 'wo_no',           path: '/production/work-orders',       include: [{ model: Item, as: 'Item', attributes: ['name'] }] },
  JC:   { model: JobCard,       field: 'job_no',          path: '/production/job-cards' },
  GRN:  { model: Grn,           field: 'grn_no',          path: '/store/grn' },
  PO:   { model: PurchaseOrder, field: 'po_no',           path: '/procurement/purchase-orders' },
  INST: { model: Instrument,    field: 'instrument_code', path: '/quality/instruments' },
  MOLD: { model: Mold,          field: 'mold_code',       path: '/mold/master' },
};

const qrLookup = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'code query parameter is required' });

    // Parse DT:<TYPE>:<IDENTIFIER>
    const parts = code.split(':');
    if (parts.length < 3 || parts[0] !== 'DT') {
      return res.status(400).json({ success: false, message: 'Invalid QR format. Expected DT:<TYPE>:<IDENTIFIER>' });
    }

    const type       = parts[1].toUpperCase();
    const identifier = parts.slice(2).join(':'); // rejoin in case identifier has colons

    const config = TYPE_MAP[type];
    if (!config) {
      return res.status(400).json({ success: false, message: `Unknown type "${type}". Supported: ${Object.keys(TYPE_MAP).join(', ')}` });
    }

    const where = { [config.field]: identifier };
    const record = await config.model.findOne({
      where,
      attributes: ['id', config.field],
      include: config.include || [],
    });

    if (!record) {
      return res.status(404).json({ success: false, message: `${type} "${identifier}" not found` });
    }

    // Build human-readable label
    let label = identifier;
    if (type === 'WO' && record.Item) label = `${identifier} — ${record.Item.name}`;

    return res.json({
      success: true,
      data: {
        type,
        identifier,
        path: config.path,
        record_id: record.id,
        label,
      },
    });
  } catch (err) {
    console.error('[qrLookup]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { qrLookup };
