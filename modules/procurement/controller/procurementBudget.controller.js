const { Op, literal } = require('sequelize');
const sequelize = require('../../../config/database');
const {
  ProcurementBudget,
  Department,
  User,
} = require('../../../models');
const Joi = require('joi');

// ── Validation ───────────────────────────────────────────────────────────────
const createSchema = Joi.object({
  department_id:    Joi.number().integer().allow(null),
  category:         Joi.string().valid('raw_material','packaging','services','capex','utilities','other').required(),
  period_type:      Joi.string().valid('annual','quarterly','monthly').required(),
  start_date:       Joi.string().isoDate().required(),
  end_date:         Joi.string().isoDate().required(),
  allocated_amount: Joi.number().positive().required(),
  notes:            Joi.string().allow('', null),
});

const updateSchema = Joi.object({
  department_id:    Joi.number().integer().allow(null),
  category:         Joi.string().valid('raw_material','packaging','services','capex','utilities','other'),
  period_type:      Joi.string().valid('annual','quarterly','monthly'),
  start_date:       Joi.string().isoDate(),
  end_date:         Joi.string().isoDate(),
  allocated_amount: Joi.number().positive(),
  notes:            Joi.string().allow('', null),
});

// ── Auto-number ───────────────────────────────────────────────────────────────
const nextBudgetNo = async () => {
  const year = new Date().getFullYear();
  const last = await ProcurementBudget.findOne({
    where:   { budget_no: { [Op.like]: `BUD-${year}-%` } },
    order:   [['created_at', 'DESC']],
  });
  const seq = last
    ? parseInt(last.budget_no.split('-').pop(), 10) + 1
    : 1;
  return `BUD-${year}-${String(seq).padStart(4, '0')}`;
};

// ── Actual spend helper (SQL) ────────────────────────────────────────────────
const actualSpendSql = (budgetAlias = '"ProcurementBudget"') => `
  COALESCE((
    SELECT SUM(poi.qty_ordered * poi.unit_price)
    FROM purchase_orders po
    JOIN purchase_order_items poi ON poi.po_id = po.id
    WHERE po.status NOT IN ('cancelled')
      AND po."created_at" BETWEEN ${budgetAlias}.start_date AND ${budgetAlias}.end_date
  ), 0)
`;

// ── Includes ─────────────────────────────────────────────────────────────────
const BASE_INCLUDE = [
  { model: Department, as: 'Department', attributes: ['id', 'name', 'code'] },
  { model: User,       as: 'Creator',    attributes: ['id', 'name'] },
];

// ── Controllers ───────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  try {
    const { status, category, department_id } = req.query;
    const where = {};
    if (status)        where.status        = status;
    if (category)      where.category      = category;
    if (department_id) where.department_id = parseInt(department_id, 10);

    const rows = await ProcurementBudget.findAll({
      where,
      include:    BASE_INCLUDE,
      attributes: {
        include: [[literal(actualSpendSql()), 'actual_spend']],
      },
      order: [['start_date', 'DESC']],
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[procurementBudget.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getById = async (req, res) => {
  try {
    const budget = await ProcurementBudget.findByPk(req.params.id, {
      include:    BASE_INCLUDE,
      attributes: {
        include: [[literal(actualSpendSql()), 'actual_spend']],
      },
    });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });

    // Fetch POs that fall within this budget's period + department
    const poWhere = `
      po.status NOT IN ('cancelled')
      AND po."created_at" BETWEEN '${budget.start_date}' AND '${budget.end_date}'
    `;
    const linkedPOs = await sequelize.query(`
      SELECT po.id, po.po_no, po.status, po."created_at",
             v.name AS vendor_name,
             COALESCE(SUM(poi.qty_ordered * poi.unit_price), 0)::FLOAT AS po_value
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
      WHERE ${poWhere}
      GROUP BY po.id, po.po_no, po.status, po."created_at", v.name
      ORDER BY po."created_at" DESC
      LIMIT 50
    `, { type: sequelize.QueryTypes.SELECT });

    return res.json({ success: true, data: { ...budget.toJSON(), linkedPOs } });
  } catch (err) {
    console.error('[procurementBudget.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const create = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    if (new Date(value.start_date) >= new Date(value.end_date)) {
      return res.status(400).json({ success: false, message: 'end_date must be after start_date' });
    }

    const budget_no = await nextBudgetNo();
    const budget = await ProcurementBudget.create({
      ...value,
      budget_no,
      created_by: req.user.id,
      updated_by: req.user.id,
    });

    return res.status(201).json({ success: true, message: 'Budget created', data: budget });
  } catch (err) {
    console.error('[procurementBudget.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const update = async (req, res) => {
  try {
    const budget = await ProcurementBudget.findByPk(req.params.id);
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    if (budget.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot edit a closed budget' });
    }

    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    if (value.start_date && value.end_date && new Date(value.start_date) >= new Date(value.end_date)) {
      return res.status(400).json({ success: false, message: 'end_date must be after start_date' });
    }

    await budget.update({ ...value, updated_by: req.user.id });
    return res.json({ success: true, message: 'Budget updated', data: budget });
  } catch (err) {
    console.error('[procurementBudget.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const close = async (req, res) => {
  try {
    const budget = await ProcurementBudget.findByPk(req.params.id);
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    if (budget.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Budget already closed' });
    }
    await budget.update({ status: 'closed', updated_by: req.user.id });
    return res.json({ success: true, message: 'Budget closed', data: budget });
  } catch (err) {
    console.error('[procurementBudget.close]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const budget = await ProcurementBudget.findByPk(req.params.id);
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    await budget.destroy();
    return res.json({ success: true, message: 'Budget deleted' });
  } catch (err) {
    console.error('[procurementBudget.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Summary for analytics ─────────────────────────────────────────────────────
const getSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const active = await ProcurementBudget.findAll({
      where: {
        status:     'active',
        start_date: { [Op.lte]: today },
        end_date:   { [Op.gte]: today },
      },
      attributes: {
        include: [[literal(actualSpendSql()), 'actual_spend']],
      },
      include: [{ model: Department, as: 'Department', attributes: ['id', 'name'] }],
    });

    const totalAllocated  = active.reduce((s, b) => s + parseFloat(b.allocated_amount), 0);
    const totalSpent      = active.reduce((s, b) => s + parseFloat(b.dataValues.actual_spend || 0), 0);
    const overrunCount    = active.filter(b => parseFloat(b.dataValues.actual_spend || 0) > parseFloat(b.allocated_amount)).length;
    const nearLimitCount  = active.filter(b => {
      const pct = (parseFloat(b.dataValues.actual_spend || 0) / parseFloat(b.allocated_amount)) * 100;
      return pct >= 80 && pct < 100;
    }).length;

    return res.json({
      success: true,
      data: {
        totalAllocated,
        totalSpent,
        overrunCount,
        nearLimitCount,
        activeBudgets: active.length,
        budgets:       active,
      },
    });
  } catch (err) {
    console.error('[procurementBudget.getSummary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, close, delete: deleteBudget, getSummary };
