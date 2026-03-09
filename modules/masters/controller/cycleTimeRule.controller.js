const { CycleTimeRule, DailyTarget, User } = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const ruleIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
  { model: DailyTarget, as: 'DailyTargets' },
];

// ─── GET /cycle-time-rules ──────────────────────────────────────────────────
const getAllRules = async (req, res) => {
  try {
    const rules = await CycleTimeRule.findAll({
      include: ruleIncludes,
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: rules });
  } catch (err) {
    console.error('[getAllRules]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /cycle-time-rules/:id ──────────────────────────────────────────────
const getRuleById = async (req, res) => {
  try {
    const rule = await CycleTimeRule.findByPk(req.params.id, { include: ruleIncludes });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    return res.json({ success: true, data: rule });
  } catch (err) {
    console.error('[getRuleById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /cycle-time-rules ────────────────────────────────────────────────
const createRule = async (req, res) => {
  try {
    const { machine_group_tag, item_group_tag, process, seconds_per_unit } = req.body;
    if (!machine_group_tag || !item_group_tag || seconds_per_unit == null) {
      return res.status(400).json({
        success: false,
        message: 'machine_group_tag, item_group_tag, and seconds_per_unit are required',
      });
    }

    const rule = await CycleTimeRule.create({
      machine_group_tag,
      item_group_tag,
      process:          process || null,
      seconds_per_unit,
      created_by:       req.user?.id || null,
      updated_by:       req.user?.id || null,
    });

    const full = await CycleTimeRule.findByPk(rule.id, { include: ruleIncludes });
    return res.status(201).json({ success: true, message: 'Rule created', data: full });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A rule with this Machine Group + Item Tag + Process already exists' });
    }
    console.error('[createRule]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /cycle-time-rules/:id ───────────────────────────────────────────
const updateRule = async (req, res) => {
  try {
    const rule = await CycleTimeRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    const { id, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    await rule.update(updateData);
    const full = await CycleTimeRule.findByPk(rule.id, { include: ruleIncludes });
    return res.json({ success: true, message: 'Rule updated', data: full });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Duplicate rule — same Machine Group + Item Tag + Process' });
    }
    console.error('[updateRule]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /cycle-time-rules/:id ───────────────────────────────────────────
const deleteRule = async (req, res) => {
  try {
    const rule = await CycleTimeRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    await rule.destroy();
    return res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (err) {
    console.error('[deleteRule]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /cycle-time-rules/:id/daily-target ───────────────────────────────
const setDailyTarget = async (req, res) => {
  try {
    const rule = await CycleTimeRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    const { start_date, end_date, target } = req.body;
    if (!start_date || !end_date || target == null) {
      return res.status(400).json({ success: false, message: 'start_date, end_date, and target are required' });
    }

    const dt = await DailyTarget.create({
      rule_id:    rule.id,
      start_date,
      end_date,
      target,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    return res.status(201).json({ success: true, message: 'Daily target set', data: dt });
  } catch (err) {
    console.error('[setDailyTarget]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /cycle-time-rules/bulk (backward compat) ─────────────────────────
const bulkSaveRules = async (req, res) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({ success: false, message: 'rules array is required' });
    }

    for (const r of rules) {
      if (!r.machine_group_tag || !r.item_group_tag || r.seconds_per_unit == null) {
        return res.status(400).json({
          success: false,
          message: 'Each rule must have machine_group_tag, item_group_tag, and seconds_per_unit',
        });
      }
    }

    await CycleTimeRule.destroy({ where: {} });
    for (const r of rules) {
      await CycleTimeRule.create({
        machine_group_tag: r.machine_group_tag,
        item_group_tag:    r.item_group_tag,
        process:           r.process || null,
        seconds_per_unit:  r.seconds_per_unit,
        created_by:        req.user?.id || null,
        updated_by:        req.user?.id || null,
      });
    }

    const full = await CycleTimeRule.findAll({ include: ruleIncludes, order: [['createdAt', 'DESC']] });
    return res.status(201).json({ success: true, message: `${rules.length} rule(s) saved`, data: full });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Duplicate tag combination' });
    }
    console.error('[bulkSaveRules]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllRules, getRuleById, createRule, updateRule, deleteRule, setDailyTarget, bulkSaveRules };
