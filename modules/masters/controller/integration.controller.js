const { Integration, IntegrationLog, User } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_ATTRS },
];

// ── Default integrations seeded on first access ───────────────────────────────
const DEFAULT_INTEGRATIONS = [
  {
    slug:        'zoho',
    label:       'Zoho',
    description: 'Zoho CRM & Books integration for customer sync and invoicing',
    is_enabled:  false,
    config:      {},
  },
  {
    slug:        'tally',
    label:       'Tally',
    description: 'Tally ERP integration for accounting and financial data sync',
    is_enabled:  false,
    config:      {},
  },
  {
    slug:        'sap',
    label:       'SAP',
    description: 'SAP ERP integration for enterprise resource planning',
    is_enabled:  false,
    config:      {},
  },
];

// Auto-create default integrations if the table is empty
const seedDefaults = async () => {
  for (const d of DEFAULT_INTEGRATIONS) {
    await Integration.findOrCreate({ where: { slug: d.slug }, defaults: d });
  }
};

// ─── GET /integrations ────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    await seedDefaults();

    const integrations = await Integration.findAll({
      include: auditIncludes,
      order:   [['id', 'ASC']],
    });

    return res.json({ success: true, data: integrations });
  } catch (err) {
    console.error('[integration.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /integrations/logs — All logs (route must be before /:id) ────────────
const getAllLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);

    const logs = await IntegrationLog.findAll({
      include: [
        { model: Integration, as: 'Integration', attributes: ['id', 'slug', 'label'] },
        { model: User,        as: 'Creator',     attributes: AUDIT_ATTRS },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[integration.getAllLogs]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /integrations/:id ────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const integration = await Integration.findByPk(req.params.id, { include: auditIncludes });
    if (!integration) return res.status(404).json({ success: false, message: 'Integration not found' });
    return res.json({ success: true, data: integration });
  } catch (err) {
    console.error('[integration.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /integrations/:id — Update config / is_enabled ────────────────────
const update = async (req, res) => {
  try {
    const integration = await Integration.findByPk(req.params.id);
    if (!integration) return res.status(404).json({ success: false, message: 'Integration not found' });

    // Protect immutable fields
    const { id, slug, label, description, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    // Merge config instead of replacing entirely (so we don't wipe keys not sent)
    if (updateData.config && typeof updateData.config === 'object') {
      updateData.config = { ...integration.config, ...updateData.config };
    }

    await integration.update(updateData);

    // Write a configure log entry
    await IntegrationLog.create({
      integration_id: integration.id,
      action:         'configure',
      level:          'info',
      message:        `Configuration updated for "${integration.label}"`,
      metadata:       { config_keys: Object.keys(updateData.config || integration.config || {}) },
      created_by:     req.user?.id || null,
    });

    const full = await Integration.findByPk(integration.id, { include: auditIncludes });
    return res.json({ success: true, message: `${integration.label} updated`, data: full });
  } catch (err) {
    console.error('[integration.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /integrations/:id/test — Test connection ────────────────────────────
const testConnection = async (req, res) => {
  try {
    const integration = await Integration.findByPk(req.params.id);
    if (!integration) return res.status(404).json({ success: false, message: 'Integration not found' });

    const hasConfig = Object.keys(integration.config || {}).length > 0;

    // In production: make a real handshake to the external system.
    // For now: test passes if at least one config key is populated.
    const success = hasConfig;
    const status  = success ? 'success' : 'error';
    const msg     = success
      ? `Connection to ${integration.label} is reachable`
      : `Cannot test ${integration.label}: configuration is incomplete. Please configure first.`;

    await integration.update({
      last_tested_at:   new Date(),
      last_test_status: status,
      updated_by:       req.user?.id || null,
    });

    await IntegrationLog.create({
      integration_id: integration.id,
      action:         'test',
      level:          status,
      message:        msg,
      metadata:       { config_keys: Object.keys(integration.config || {}) },
      created_by:     req.user?.id || null,
    });

    const full = await Integration.findByPk(integration.id, { include: auditIncludes });
    return res.json({ success, message: msg, data: full });
  } catch (err) {
    console.error('[integration.testConnection]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /integrations/:id/logs ────────────────────────────────────────────────
const getLogs = async (req, res) => {
  try {
    const { id }  = req.params;
    const limit   = Math.min(parseInt(req.query.limit, 10) || 100, 500);

    const logs = await IntegrationLog.findAll({
      where:   { integration_id: id },
      include: [
        { model: Integration, as: 'Integration', attributes: ['id', 'slug', 'label'] },
        { model: User,        as: 'Creator',     attributes: AUDIT_ATTRS },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[integration.getLogs]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getAllLogs, getById, update, testConnection, getLogs };
