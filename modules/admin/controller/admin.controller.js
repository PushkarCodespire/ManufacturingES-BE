'use strict';
const { Op } = require('sequelize');
const {
  ModuleSetting, FeatureSetting, FieldVisibility,
  AiAgentSetting, AdminAuditLog, User, Role,
} = require('../../../models');

// ── Helper: log admin action ──────────────────────────────────────────────
const logAction = async (req, action, entityType, entityId, oldVal, newVal) => {
  try {
    await AdminAuditLog.create({
      actor_id:    req.user.id,
      actor_name:  req.user.name || `User #${req.user.id}`,
      action,
      entity_type: entityType,
      entity_id:   String(entityId),
      old_value:   oldVal,
      new_value:   newVal,
      ip_address:  req.ip || req.connection?.remoteAddress,
    });
  } catch (err) {
    console.warn('[admin.logAction]', err.message);
  }
};

// ── Default modules seed data ─────────────────────────────────────────────
const DEFAULT_MODULES = [
  { module_key: 'management',    display_name: 'Management',        display_order: 1 },
  { module_key: 'quality',       display_name: 'Quality Control',   display_order: 2 },
  { module_key: 'procurement',   display_name: 'Procurement',       display_order: 3 },
  { module_key: 'store',         display_name: 'Store / Warehouse', display_order: 4 },
  { module_key: 'production',    display_name: 'Production',        display_order: 5 },
  { module_key: 'dispatch',      display_name: 'Dispatch',          display_order: 6 },
  { module_key: 'accounts',      display_name: 'Accounts / Finance',display_order: 7 },
  { module_key: 'hr',            display_name: 'HR / Admin',        display_order: 8 },
  { module_key: 'npd',           display_name: 'NPD / Documents',   display_order: 9 },
  { module_key: 'masters',       display_name: 'Masters',           display_order: 10 },
];

const DEFAULT_AI_AGENTS = [
  { agent_key: 'iqc_advisor',       display_name: 'IQC Advisor',           description: 'Incoming quality inspection assistant' },
  { agent_key: 'production_planner',display_name: 'Production Planner AI', description: 'Scheduling, shortage & bottleneck detection' },
  { agent_key: 'quality_analyst',   display_name: 'Quality Analyst',       description: 'Root cause, CAPA & defect pattern analysis' },
  { agent_key: 'procurement_agent', display_name: 'Procurement Agent',     description: 'RFQ auto-fill, price suggestion, vendor scoring' },
  { agent_key: 'store_optimizer',   display_name: 'Store Optimizer',       description: 'Stock prediction, reorder alerts' },
  { agent_key: 'dispatch_tracker',  display_name: 'Dispatch Tracker',      description: 'OTD tracking, priority suggestions' },
  { agent_key: 'npd_assistant',     display_name: 'NPD Assistant',         description: 'Dimension extraction, PFMEA failure modes' },
  { agent_key: 'general_madad',     display_name: 'Madad General',         description: 'General-purpose factory assistant' },
];

// ── Default features seed data ───────────────────────────────────────────
const DEFAULT_FEATURES = [
  // Management
  { feature_key: 'mgt_dashboard',       module_key: 'management',  display_name: 'Management Dashboard' },
  { feature_key: 'mgt_kpi',             module_key: 'management',  display_name: 'KPI Monitoring' },
  // Quality
  { feature_key: 'iqc_inspection',      module_key: 'quality',     display_name: 'IQC Inspection' },
  { feature_key: 'pqc_inspection',      module_key: 'quality',     display_name: 'PQC Inspection' },
  { feature_key: 'oqc_inspection',      module_key: 'quality',     display_name: 'OQC Inspection' },
  { feature_key: 'capa_management',     module_key: 'quality',     display_name: 'CAPA Management' },
  { feature_key: 'ncr_management',      module_key: 'quality',     display_name: 'NCR Management' },
  { feature_key: 'complaints',          module_key: 'quality',     display_name: 'Complaint Handling' },
  { feature_key: 'instruments',         module_key: 'quality',     display_name: 'Instrument Calibration' },
  // Procurement
  { feature_key: 'purchase_orders',     module_key: 'procurement', display_name: 'Purchase Orders' },
  { feature_key: 'rfq_management',      module_key: 'procurement', display_name: 'RFQ Management' },
  { feature_key: 'vendor_scoring',      module_key: 'procurement', display_name: 'Vendor Scoring' },
  { feature_key: 'scar_management',     module_key: 'procurement', display_name: 'SCAR Management' },
  { feature_key: 'subcontracting',      module_key: 'procurement', display_name: 'Subcontracting' },
  // Store
  { feature_key: 'grn',                 module_key: 'store',       display_name: 'Goods Receipt (GRN)' },
  { feature_key: 'material_requests',   module_key: 'store',       display_name: 'Material Requests' },
  { feature_key: 'stock_management',    module_key: 'store',       display_name: 'Stock Management' },
  { feature_key: 'material_transfers',  module_key: 'store',       display_name: 'Material Transfers' },
  // Production
  { feature_key: 'dpr',                 module_key: 'production',  display_name: 'Daily Production Report' },
  { feature_key: 'work_centre',         module_key: 'production',  display_name: 'Work Centre' },
  { feature_key: 'machine_management',  module_key: 'production',  display_name: 'Machine Management' },
  { feature_key: 'production_planning', module_key: 'production',  display_name: 'Production Planning' },
  { feature_key: 'maintenance',         module_key: 'production',  display_name: 'Maintenance' },
  // Dispatch
  { feature_key: 'dispatch_planning',   module_key: 'dispatch',    display_name: 'Dispatch Planning' },
  { feature_key: 'dispatch_tracking',   module_key: 'dispatch',    display_name: 'Dispatch Tracking' },
  // Accounts
  { feature_key: 'tally_sync',          module_key: 'accounts',    display_name: 'Tally Sync' },
  { feature_key: 'invoicing',           module_key: 'accounts',    display_name: 'Invoicing' },
  // HR
  { feature_key: 'employee_management', module_key: 'hr',          display_name: 'Employee Management' },
  { feature_key: 'attendance_shifts',   module_key: 'hr',          display_name: 'Attendance & Shifts' },
  // NPD
  { feature_key: 'drawings',            module_key: 'npd',         display_name: 'Drawing Management' },
  { feature_key: 'check_sheets',        module_key: 'npd',         display_name: 'Check Sheets' },
  { feature_key: 'pfmea',               module_key: 'npd',         display_name: 'PFMEA' },
  // Masters
  { feature_key: 'item_master',         module_key: 'masters',     display_name: 'Item Master' },
  { feature_key: 'customer_master',     module_key: 'masters',     display_name: 'Customer Master' },
  { feature_key: 'vendor_master',       module_key: 'masters',     display_name: 'Vendor Master' },
  { feature_key: 'machine_master',      module_key: 'masters',     display_name: 'Machine Master' },
  { feature_key: 'warehouse_master',    module_key: 'masters',     display_name: 'Warehouse Master' },
];

// ── Permission Registry ──────────────────────────────────────────────────
// Compact definition: { module, features[] } → expanded with -read / -create_edit_delete suffixes
const PERM_GROUPS = [
  { module: 'Sites',              items: ['sites-configuration', 'sites-employees___access', 'sites-shifts___leaves', 'sites-integrations', 'sites-costing'] },
  { module: 'Production Masters', items: ['production-machines', 'production-items', 'production-cycle_time_rules', 'production-tools', 'production-downtime', 'production-quality', 'production-production_forms'] },
  { module: 'Planning Masters',   items: ['planning-customers', 'planning-vendors', 'planning-sticker_templates'] },
  { module: 'Inventory Masters',  items: ['inventory-warehouses', 'inventory-packages', 'inventory-custom_fields'] },
  { module: 'Other Masters',      items: ['other-reports', 'other-tag_management', 'other-templates', 'other-automation', 'other-onboarding'] },
  { module: 'Quality',            items: ['quality-capa', 'quality-ncr', 'quality-complaints', 'quality-instruments'] },
  { module: 'NPD / Documents',    items: ['npd-drawings', 'npd-check_sheets', 'npd-pfmea'] },
  { module: 'Store',              items: ['store-requests-material_request', 'store-requests-issue_request', 'store-requests-transfer_request', 'store-approval-request_approval', 'store-approval-grn_approval', 'store-transactions-grn', 'store-transactions-issue_slip', 'store-transactions-material_transfer', 'store-transactions-material_returns', 'store-inventory-stock_ledger', 'store-inventory-stock_adjustment', 'store-inventory-stock_report'] },
  { module: 'Production',         items: ['prod-dashboard-production_overview', 'prod-dashboard-machine_status', 'prod-dpr-daily_production_report', 'prod-dpr-rejection_entry', 'prod-dpr-rework_entry', 'prod-work_centre-view_work_centre', 'prod-work_centre-manage_work_centre', 'prod-machines-machine_list', 'prod-machines-manage_machines', 'prod-quality_level-iqc', 'prod-quality_level-pqc', 'prod-quality_level-oqc', 'prod-quality_level-capa', 'prod-maintenance-preventive_maintenance', 'prod-maintenance-breakdown_maintenance', 'prod-maintenance-downtime_log'] },
  { module: 'Orders',             items: ['plan-orders-rfq', 'plan-orders-quotation', 'plan-orders-customer_po', 'plan-orders-order_tracking'] },
  { module: 'Procurement',        items: ['plan-po-create_po', 'plan-po-approve_po', 'plan-po-po_reports', 'plan-subcontracting-outward_challan', 'plan-subcontracting-inward_challan', 'plan-customer-vendor-customers', 'plan-customer-vendor-vendors', 'plan-scar-scar', 'plan-bom-explosion-bom_explosion', 'plan-supplier-scorecard-supplier_scorecard'] },
  { module: 'Scheduling',         items: ['plan-scheduling-production_plan', 'plan-scheduling-dispatch_plan', 'plan-dpp-create_plan', 'plan-capacity-view_capacity', 'plan-capacity-manage_capacity'] },
  { module: 'Dispatch',           items: ['plan-dispatch-create_dispatch', 'plan-dispatch-dispatch_history', 'plan-receipt-create_receipt_plan', 'plan-receipt-receipt_history', 'plan-indent-create_indent', 'plan-indent-indent_history', 'plan-indent-approve_indent'] },
];

const STANDARD_SUFFIXES = ['read', 'create_edit_delete'];

/** Build flat permission list from registry */
function buildPermissionRegistry() {
  const all = [];
  for (const { module, items } of PERM_GROUPS) {
    for (const base of items) {
      for (const suf of STANDARD_SUFFIXES) {
        const key = `${base}-${suf}`;
        const label = base
          .replace(/^(sites|production|planning|inventory|other|quality|npd|store|prod|plan)-/, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          + ` — ${suf === 'read' ? 'View' : 'Edit'}`;
        all.push({ key, label, module });
      }
    }
  }
  return all;
}

const ALL_PERMISSIONS = buildPermissionRegistry();

// ── Module Toggles ────────────────────────────────────────────────────────
exports.getModules = async (req, res) => {
  try {
    let modules = await ModuleSetting.findAll({ order: [['display_order', 'ASC']] });
    if (modules.length < DEFAULT_MODULES.length) {
      await ModuleSetting.bulkCreate(
        DEFAULT_MODULES.map((m) => ({ ...m, is_enabled: true })),
        { ignoreDuplicates: true }
      );
      modules = await ModuleSetting.findAll({ order: [['display_order', 'ASC']] });
    }
    res.json({ success: true, data: modules });
  } catch (err) {
    console.error('[admin.getModules]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleModule = async (req, res) => {
  try {
    const row = await ModuleSetting.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Module not found' });
    const oldVal = row.is_enabled;
    await row.update({ is_enabled: req.body.is_enabled });
    await logAction(req, 'toggle_module', 'module', row.module_key, { is_enabled: oldVal }, { is_enabled: req.body.is_enabled });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[admin.toggleModule]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Feature Toggles ───────────────────────────────────────────────────────
exports.getFeatures = async (req, res) => {
  try {
    const { module_key } = req.query;
    const where = module_key ? { module_key } : {};
    let features = await FeatureSetting.findAll({ where, order: [['module_key', 'ASC'], ['display_name', 'ASC']] });
    // Seed defaults on first access
    if (!module_key && features.length < DEFAULT_FEATURES.length) {
      await FeatureSetting.bulkCreate(
        DEFAULT_FEATURES.map((f) => ({ ...f, is_enabled: true })),
        { ignoreDuplicates: true },
      );
      features = await FeatureSetting.findAll({ where, order: [['module_key', 'ASC'], ['display_name', 'ASC']] });
    }
    res.json({ success: true, data: features });
  } catch (err) {
    console.error('[admin.getFeatures]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleFeature = async (req, res) => {
  try {
    const row = await FeatureSetting.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Feature not found' });
    const oldVal = row.is_enabled;
    await row.update({ is_enabled: req.body.is_enabled });
    await logAction(req, 'toggle_feature', 'feature', row.feature_key, { is_enabled: oldVal }, { is_enabled: req.body.is_enabled });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[admin.toggleFeature]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Role Permission Grid ──────────────────────────────────────────────────
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ attributes: ['id', 'name', 'label'], order: [['name', 'ASC']] });
    res.json({ success: true, data: roles });
  } catch (err) {
    console.error('[admin.getRoles]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRolePermissionGrid = async (req, res) => {
  try {
    const { roleId } = req.params;

    // Get granted permissions for this role's users
    const roleUsers = await User.findAll({
      where: { role_id: roleId },
      attributes: ['permissions'],
      raw: true,
    });
    const grantedSet = new Set();
    roleUsers.forEach((u) => (u.permissions || []).forEach((k) => grantedSet.add(k)));

    // Build grid from the permission registry + any extra keys found on users
    const registryKeys = new Set(ALL_PERMISSIONS.map((p) => p.key));
    const grid = ALL_PERMISSIONS.map((p) => ({
      ...p,
      granted: grantedSet.has(p.key),
    }));

    // Add any extra keys the role has that aren't in the registry
    for (const key of grantedSet) {
      if (!registryKeys.has(key)) {
        const parts = key.split('-');
        grid.push({
          key,
          label: key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          module: (parts[0] || 'Other').charAt(0).toUpperCase() + (parts[0] || 'other').slice(1),
          granted: true,
        });
      }
    }

    res.json({ success: true, data: grid });
  } catch (err) {
    console.error('[admin.getRolePermissionGrid]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ success: false, message: 'permissions must be an array' });

    const users = await User.findAll({ where: { role_id: req.params.roleId } });
    const oldPerms = users[0]?.permissions || [];
    for (const user of users) {
      await user.update({ permissions });
    }
    await logAction(req, 'update_permissions', 'role', req.params.roleId, { permissions: oldPerms }, { permissions });
    res.json({ success: true, message: `Updated permissions for ${users.length} user(s)` });
  } catch (err) {
    console.error('[admin.updateRolePermissions]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── User Overrides ────────────────────────────────────────────────────────
exports.searchUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = search ? { name: { [Op.iLike]: `%${search}%` } } : {};
    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'employee_id', 'permissions', 'role_id'],
      include: [{ model: Role, attributes: ['id', 'name', 'label'] }],
      limit: 20,
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('[admin.searchUsers]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserOverrides = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'name', 'email', 'permissions', 'role_id'],
      include: [{ model: Role, attributes: ['id', 'name', 'label'] }],
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[admin.getUserOverrides]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUserOverride = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const oldPerms = user.permissions || [];
    await user.update({ permissions: req.body.permissions || [] });
    await logAction(req, 'update_user_override', 'user', user.id, { permissions: oldPerms }, { permissions: req.body.permissions });
    res.json({ success: true, message: 'User permissions updated' });
  } catch (err) {
    console.error('[admin.updateUserOverride]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── AI Agent Toggles ──────────────────────────────────────────────────────
exports.getAiAgents = async (req, res) => {
  try {
    let agents = await AiAgentSetting.findAll({ order: [['display_name', 'ASC']] });
    if (agents.length < DEFAULT_AI_AGENTS.length) {
      await AiAgentSetting.bulkCreate(
        DEFAULT_AI_AGENTS.map((a) => ({ ...a, is_enabled: true })),
        { ignoreDuplicates: true }
      );
      agents = await AiAgentSetting.findAll({ order: [['display_name', 'ASC']] });
    }
    res.json({ success: true, data: agents });
  } catch (err) {
    console.error('[admin.getAiAgents]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleAiAgent = async (req, res) => {
  try {
    const row = await AiAgentSetting.findByPk(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'AI agent not found' });
    const oldVal = { is_enabled: row.is_enabled, budget_limit: row.budget_limit };
    const updates = {};
    if (req.body.is_enabled !== undefined) updates.is_enabled = req.body.is_enabled;
    if (req.body.budget_limit !== undefined) updates.budget_limit = req.body.budget_limit;
    await row.update(updates);
    await logAction(req, 'toggle_agent', 'ai_agent', row.agent_key, oldVal, updates);
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[admin.toggleAiAgent]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Field Visibility ──────────────────────────────────────────────────────
exports.getFieldVisibility = async (req, res) => {
  try {
    const rows = await FieldVisibility.findAll({
      where: { feature_key: req.params.featureKey },
      order: [['field_name', 'ASC'], ['role', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin.getFieldVisibility]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateFieldVisibility = async (req, res) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields)) return res.status(400).json({ success: false, message: 'fields must be an array' });

    const featureKey = req.params.featureKey;
    await FieldVisibility.destroy({ where: { feature_key: featureKey } });
    if (fields.length) {
      await FieldVisibility.bulkCreate(
        fields.map((f) => ({ ...f, feature_key: featureKey })),
      );
    }
    await logAction(req, 'update_field_visibility', 'field', featureKey, null, { count: fields.length });
    res.json({ success: true, message: `${fields.length} field visibility rule(s) saved` });
  } catch (err) {
    console.error('[admin.updateFieldVisibility]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Audit Log ─────────────────────────────────────────────────────────────
exports.getAuditLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type, actor_id, from, to } = req.query;
    const where = {};
    if (action)      where.action      = action;
    if (entity_type) where.entity_type = entity_type;
    if (actor_id)    where.actor_id    = actor_id;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to)   where.created_at[Op.lte] = new Date(to);
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await AdminAuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'Actor', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('[admin.getAuditLog]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
