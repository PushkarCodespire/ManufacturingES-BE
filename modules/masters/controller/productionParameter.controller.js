const { ProductionParameter, User } = require('../../../models');

const AUDIT_USER_ATTRS = ['id', 'name', 'employee_id'];

const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_USER_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_USER_ATTRS },
];

// ─── GET /production-parameters ──────────────────────────────────────────────
const getAllParameters = async (req, res) => {
  try {
    const params = await ProductionParameter.findAll({
      where: { is_active: true },
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: params });
  } catch (err) {
    console.error('[getAllParameters]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /production-parameters ─────────────────────────────────────────────
const createParameter = async (req, res) => {
  try {
    const { name, type, formula, ctq } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Parameter name is required' });
    }

    const param = await ProductionParameter.create({
      name:       name.trim(),
      type:       type || 'number',
      formula:    type === 'derived' ? (formula || null) : null,
      ctq:        type === 'derived' ? (ctq || null) : null,
      is_active:  true,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });

    return res.status(201).json({ success: true, data: param });
  } catch (err) {
    console.error('[createParameter]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /production-parameters/bulk ────────────────────────────────────────
const bulkCreateParameters = async (req, res) => {
  try {
    const { parameters } = req.body;
    if (!Array.isArray(parameters) || parameters.length === 0) {
      return res.status(400).json({ success: false, message: 'Parameters array is required' });
    }

    const created = [];
    for (const p of parameters) {
      if (!p.name?.trim()) continue;
      const param = await ProductionParameter.create({
        name:       p.name.trim(),
        type:       p.type || 'number',
        formula:    p.type === 'derived' ? (p.formula || null) : null,
        ctq:        p.type === 'derived' ? (p.ctq || null) : null,
        is_active:  true,
        created_by: req.user?.id || null,
        updated_by: req.user?.id || null,
      });
      created.push(param);
    }

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[bulkCreateParameters]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /production-parameters/:id ───────────────────────────────────────
const deleteParameter = async (req, res) => {
  try {
    const param = await ProductionParameter.findByPk(req.params.id);
    if (!param) return res.status(404).json({ success: false, message: 'Parameter not found' });
    await param.update({ is_active: false, updated_by: req.user?.id || null });
    return res.json({ success: true, message: 'Parameter deleted' });
  } catch (err) {
    console.error('[deleteParameter]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllParameters, createParameter, bulkCreateParameters, deleteParameter };
