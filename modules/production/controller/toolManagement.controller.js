const { Op } = require('sequelize');
const { ToolLog, Tool, Machine, JobCard, WorkOrder, User } = require('../../../models');

// ── GET /tool-logs ────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { tool_id, machine_id, job_card_id, date_from, date_to, condition } = req.query;
    const where = {};
    if (tool_id)    where.tool_id    = tool_id;
    if (machine_id) where.machine_id = machine_id;
    if (job_card_id) where.job_card_id = job_card_id;
    if (condition)  where.condition_after = condition;
    if (date_from || date_to) {
      where.used_at = {};
      if (date_from) where.used_at[Op.gte] = date_from;
      if (date_to)   where.used_at[Op.lte] = date_to;
    }

    const logs = await ToolLog.findAll({
      where,
      include: [
        { model: Tool,    as: 'Tool',    attributes: ['id', 'code', 'name'] },
        { model: Machine, as: 'Machine', attributes: ['id', 'name'], required: false },
        { model: User,    as: 'Creator', attributes: ['id', 'name'], required: false },
      ],
      order: [['used_at', 'DESC'], ['created_at', 'DESC']],
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[ToolManagement.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /tool-logs/summary ────────────────────────────────────────────────────
// Returns per-tool usage summary: total strokes, last used, current condition
const getSummary = async (req, res) => {
  try {
    const tools = await Tool.findAll({
      where:      { is_active: true },
      attributes: ['id', 'code', 'name', 'lifetime_entries'],
      include: [
        {
          model:      ToolLog,
          as:         'Logs',
          attributes: ['usage_strokes', 'used_at', 'condition_after'],
          required:   false,
        },
      ],
    });

    const summary = tools.map(tool => {
      const logs         = tool.Logs || [];
      const totalStrokes = logs.reduce((s, l) => s + (l.usage_strokes || 0), 0);
      const lastLog      = logs.sort((a, b) => new Date(b.used_at) - new Date(a.used_at))[0];

      // Pull first lifetime entry for rated life
      const firstEntry    = Array.isArray(tool.lifetime_entries) ? tool.lifetime_entries[0] : null;
      const ratedLife     = firstEntry?.lifetime_strokes || null;
      const maintenanceCy = firstEntry?.maintenance_cycle_strokes || null;

      return {
        tool_id:            tool.id,
        tool_code:          tool.code,
        tool_name:          tool.name,
        total_strokes:      totalStrokes,
        last_used:          lastLog?.used_at || null,
        current_condition:  lastLog?.condition_after || 'good',
        rated_life_strokes: ratedLife,
        maintenance_cycle:  maintenanceCy,
        life_pct:           ratedLife ? parseFloat(((totalStrokes / ratedLife) * 100).toFixed(1)) : null,
        log_count:          logs.length,
      };
    });

    return res.json({ success: true, data: summary });
  } catch (err) {
    console.error('[ToolManagement.getSummary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /tool-logs/tool/:toolId ───────────────────────────────────────────────
const getByTool = async (req, res) => {
  try {
    const tool = await Tool.findByPk(req.params.toolId, { attributes: ['id', 'code', 'name', 'lifetime_entries'] });
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' });

    const logs = await ToolLog.findAll({
      where: { tool_id: req.params.toolId },
      include: [
        { model: Machine, as: 'Machine', attributes: ['id', 'name'], required: false },
        { model: User,    as: 'Creator', attributes: ['id', 'name'], required: false },
      ],
      order: [['used_at', 'DESC']],
    });

    return res.json({ success: true, data: { tool, logs } });
  } catch (err) {
    console.error('[ToolManagement.getByTool]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /tool-logs ───────────────────────────────────────────────────────────
const logUsage = async (req, res) => {
  try {
    const { tool_id, usage_strokes, used_at, machine_id, job_card_id, work_order_id, condition_after, notes } = req.body;
    if (!tool_id || !usage_strokes) {
      return res.status(400).json({ success: false, message: 'tool_id and usage_strokes are required' });
    }

    const tool = await Tool.findByPk(tool_id);
    if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' });

    const log = await ToolLog.create({
      tool_id,
      usage_strokes: parseInt(usage_strokes, 10),
      used_at:         used_at         || new Date(),
      machine_id:      machine_id      || null,
      job_card_id:     job_card_id     || null,
      work_order_id:   work_order_id   || null,
      condition_after: condition_after || 'good',
      notes:           notes           || null,
      created_by:      req.user.id,
    });

    const full = await ToolLog.findByPk(log.id, {
      include: [
        { model: Tool,    as: 'Tool',    attributes: ['id', 'code', 'name'] },
        { model: Machine, as: 'Machine', attributes: ['id', 'name'], required: false },
      ],
    });
    return res.status(201).json({ success: true, data: full });
  } catch (err) {
    console.error('[ToolManagement.logUsage]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DELETE /tool-logs/:id ─────────────────────────────────────────────────────
const deleteLog = async (req, res) => {
  try {
    const log = await ToolLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Tool log not found' });
    await log.destroy();
    return res.json({ success: true, message: 'Tool log deleted' });
  } catch (err) {
    console.error('[ToolManagement.deleteLog]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAll,
  getSummary,
  getByTool,
  logUsage,
  deleteLog,
};
