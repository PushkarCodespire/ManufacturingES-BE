const { AuditLog, User, Role, Department } = require('../../../models');
const { Op } = require('sequelize');

// ─── Helper: parse pagination params ─────────────────────────────────────────
const paginate = (query) => {
  const page  = Math.max(1, parseInt(query.page  || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20, 10)));
  return { limit, offset: (page - 1) * limit, page };
};

// ─── GET /audit/my — Logged-in user's own audit trail ────────────────────────
const getMyAuditLog = async (req, res) => {
  try {
    const { limit, offset, page } = paginate(req.query);
    const { action }              = req.query; // optional filter

    const where = { user_id: req.user.id };
    if (action) where.action = action.toUpperCase();

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order:  [['createdAt', 'DESC']],
      limit,
      offset,
      attributes: ['id', 'action', 'status', 'ip_address', 'metadata', 'createdAt'],
    });

    return res.json({
      success: true,
      data: {
        logs:       rows,
        total:      count,
        page,
        totalPages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (err) {
    console.error('[getMyAuditLog]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /audit/all — All users' audit logs (IT Admin / Plant Head only) ──────
const getAllAuditLogs = async (req, res) => {
  try {
    const { limit, offset, page } = paginate(req.query);
    const { action, employee_id } = req.query;

    const where = {};
    if (action)      where.action      = action.toUpperCase();
    if (employee_id) where.employee_id = { [Op.iLike]: `%${employee_id}%` };

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order:  [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model:      User,
          as:         'User',
          attributes: ['id', 'name', 'employee_id'],
          required:   false,
          include: [
            { model: Role,       attributes: ['label'] },
            { model: Department, attributes: ['name', 'code'] },
          ],
        },
      ],
    });

    return res.json({
      success: true,
      data: {
        logs:       rows,
        total:      count,
        page,
        totalPages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (err) {
    console.error('[getAllAuditLogs]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /audit/summary — Quick stats for current user ───────────────────────
const getMyAuditSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalLogins, failedLogins, lastLogin] = await Promise.all([
      AuditLog.count({ where: { user_id: userId, action: 'LOGIN',        status: 'SUCCESS' } }),
      AuditLog.count({ where: { user_id: userId, action: 'FAILED_LOGIN', status: 'FAILED'  } }),
      AuditLog.findOne({
        where:      { user_id: userId, action: 'LOGIN', status: 'SUCCESS' },
        order:      [['createdAt', 'DESC']],
        attributes: ['createdAt', 'ip_address'],
      }),
    ]);

    return res.json({
      success: true,
      data: { totalLogins, failedLogins, lastLogin },
    });
  } catch (err) {
    console.error('[getMyAuditSummary]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMyAuditLog, getAllAuditLogs, getMyAuditSummary };
