'use strict';

const router = require('express').Router();
const { authenticate, authorize } = require('../config/middleware');
const { AiUsageLog, User, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

const ADMIN_ROLES = ['plant_head', 'it_admin'];

// GET /api/admin/ai-dashboard/summary — Current month totals + budget
router.get('/summary', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const budgetCents = parseInt(process.env.AI_MONTHLY_BUDGET_CENTS, 10) || 1500;

    const result = await AiUsageLog.findOne({
      where: { created_at: { [Op.gte]: startOfMonth }, cached: false },
      attributes: [
        [fn('COUNT', col('id')), 'total_calls'],
        [fn('SUM', col('input_tokens')), 'total_input_tokens'],
        [fn('SUM', col('output_tokens')), 'total_output_tokens'],
        [fn('SUM', col('cost_cents')), 'total_cost_cents'],
      ],
      raw: true,
    });

    const totalCalls = parseInt(result.total_calls) || 0;
    const totalCostCents = parseFloat(result.total_cost_cents) || 0;
    const totalInputTokens = parseInt(result.total_input_tokens) || 0;
    const totalOutputTokens = parseInt(result.total_output_tokens) || 0;

    res.json({
      success: true,
      data: {
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        total_calls: totalCalls,
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_cost_cents: Math.round(totalCostCents * 100) / 100,
        budget_cents: budgetCents,
        budget_remaining_cents: Math.round((budgetCents - totalCostCents) * 100) / 100,
        budget_used_pct: budgetCents > 0 ? Math.round((totalCostCents / budgetCents) * 10000) / 100 : 0,
        avg_cost_per_call: totalCalls > 0 ? Math.round((totalCostCents / totalCalls) * 100) / 100 : 0,
        ai_enabled: process.env.AI_ENABLED === 'true',
      },
    });
  } catch (err) {
    console.error('[aiDashboard] summary error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/ai-dashboard/daily — Daily cost breakdown (last 30 days)
router.get('/daily', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await AiUsageLog.findAll({
      where: { created_at: { [Op.gte]: thirtyDaysAgo }, cached: false },
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'calls'],
        [fn('SUM', col('cost_cents')), 'cost_cents'],
        [fn('SUM', col('input_tokens')), 'input_tokens'],
        [fn('SUM', col('output_tokens')), 'output_tokens'],
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: rows.map(r => ({
      date: r.date,
      calls: parseInt(r.calls) || 0,
      cost_cents: Math.round((parseFloat(r.cost_cents) || 0) * 100) / 100,
      input_tokens: parseInt(r.input_tokens) || 0,
      output_tokens: parseInt(r.output_tokens) || 0,
    })) });
  } catch (err) {
    console.error('[aiDashboard] daily error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/ai-dashboard/by-agent — Cost per agent
router.get('/by-agent', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await AiUsageLog.findAll({
      where: { created_at: { [Op.gte]: startOfMonth }, cached: false },
      attributes: [
        'agent_key',
        [fn('COUNT', col('id')), 'calls'],
        [fn('SUM', col('cost_cents')), 'cost_cents'],
        [fn('SUM', col('input_tokens')), 'input_tokens'],
        [fn('SUM', col('output_tokens')), 'output_tokens'],
      ],
      group: ['agent_key'],
      order: [[fn('SUM', col('cost_cents')), 'DESC']],
      raw: true,
    });

    res.json({ success: true, data: rows.map(r => ({
      agent_key: r.agent_key,
      calls: parseInt(r.calls) || 0,
      cost_cents: Math.round((parseFloat(r.cost_cents) || 0) * 100) / 100,
      input_tokens: parseInt(r.input_tokens) || 0,
      output_tokens: parseInt(r.output_tokens) || 0,
    })) });
  } catch (err) {
    console.error('[aiDashboard] by-agent error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/ai-dashboard/by-user — Top 20 users by cost
router.get('/by-user', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await AiUsageLog.findAll({
      where: { created_at: { [Op.gte]: startOfMonth }, cached: false, user_id: { [Op.ne]: null } },
      attributes: [
        'user_id',
        [fn('COUNT', col('AiUsageLog.id')), 'calls'],
        [fn('SUM', col('cost_cents')), 'cost_cents'],
        [fn('SUM', col('input_tokens')), 'input_tokens'],
        [fn('SUM', col('output_tokens')), 'output_tokens'],
      ],
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'employee_id'] }],
      group: ['user_id', 'User.id', 'User.name', 'User.employee_id'],
      order: [[fn('SUM', col('cost_cents')), 'DESC']],
      limit: 20,
      raw: true,
      nest: true,
    });

    res.json({ success: true, data: rows.map(r => ({
      user_id: r.user_id,
      user_name: r.User?.name || 'System',
      employee_id: r.User?.employee_id || '',
      calls: parseInt(r.calls) || 0,
      cost_cents: Math.round((parseFloat(r.cost_cents) || 0) * 100) / 100,
      input_tokens: parseInt(r.input_tokens) || 0,
      output_tokens: parseInt(r.output_tokens) || 0,
    })) });
  } catch (err) {
    console.error('[aiDashboard] by-user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/ai-dashboard/by-model — Cost per model
router.get('/by-model', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await AiUsageLog.findAll({
      where: { created_at: { [Op.gte]: startOfMonth }, cached: false },
      attributes: [
        'model',
        [fn('COUNT', col('id')), 'calls'],
        [fn('SUM', col('cost_cents')), 'cost_cents'],
        [fn('SUM', col('input_tokens')), 'input_tokens'],
        [fn('SUM', col('output_tokens')), 'output_tokens'],
      ],
      group: ['model'],
      order: [[fn('SUM', col('cost_cents')), 'DESC']],
      raw: true,
    });

    res.json({ success: true, data: rows.map(r => ({
      model: r.model,
      calls: parseInt(r.calls) || 0,
      cost_cents: Math.round((parseFloat(r.cost_cents) || 0) * 100) / 100,
      input_tokens: parseInt(r.input_tokens) || 0,
      output_tokens: parseInt(r.output_tokens) || 0,
    })) });
  } catch (err) {
    console.error('[aiDashboard] by-model error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/ai-dashboard/history — Monthly totals (last 12 months)
router.get('/history', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const rows = await sequelize.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as calls,
        SUM(cost_cents) as cost_cents,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens
      FROM ai_usage_logs
      WHERE created_at >= :since AND cached = false
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `, {
      replacements: { since: twelveMonthsAgo },
      type: sequelize.QueryTypes.SELECT,
    });

    res.json({ success: true, data: rows.map(r => ({
      month: r.month,
      calls: parseInt(r.calls) || 0,
      cost_cents: Math.round((parseFloat(r.cost_cents) || 0) * 100) / 100,
      input_tokens: parseInt(r.input_tokens) || 0,
      output_tokens: parseInt(r.output_tokens) || 0,
    })) });
  } catch (err) {
    console.error('[aiDashboard] history error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/ai-dashboard/recent — Last 50 AI calls
router.get('/recent', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const rows = await AiUsageLog.findAll({
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'employee_id'] }],
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    res.json({ success: true, data: rows.map(r => ({
      id: r.id,
      user_name: r.User?.name || 'System',
      employee_id: r.User?.employee_id || '',
      agent_key: r.agent_key,
      model: r.model,
      input_tokens: r.input_tokens,
      output_tokens: r.output_tokens,
      cost_cents: parseFloat(r.cost_cents) || 0,
      endpoint: r.endpoint,
      cached: r.cached,
      created_at: r.created_at,
    })) });
  } catch (err) {
    console.error('[aiDashboard] recent error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/ai-dashboard/budget — Update monthly budget
router.put('/budget', authenticate, authorize(...ADMIN_ROLES), async (req, res) => {
  try {
    const { budget_usd } = req.body;
    if (budget_usd === undefined || budget_usd < 0) {
      return res.status(400).json({ success: false, message: 'budget_usd is required and must be >= 0' });
    }
    const budgetCents = Math.round(budget_usd * 100);
    // Update env var in memory (persists until restart)
    process.env.AI_MONTHLY_BUDGET_CENTS = String(budgetCents);
    res.json({ success: true, data: { budget_usd, budget_cents: budgetCents }, message: `Budget updated to $${budget_usd}` });
  } catch (err) {
    console.error('[aiDashboard] budget error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
