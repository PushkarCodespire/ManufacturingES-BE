'use strict';

const { Op } = require('sequelize');
const { WhatsappLog, User } = require('../../../models');
const { getStatus, sendWhatsApp } = require('../../../services/whatsapp.service');

// ── GET /admin/whatsapp/status ────────────────────────────────────────────────
const getWhatsappStatus = async (req, res) => {
  try {
    const status = getStatus();

    // Log stats from last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [sentCount, failedCount, skippedCount] = await Promise.all([
      WhatsappLog.count({ where: { status: 'sent',    created_at: { [Op.gte]: since } } }).catch(() => 0),
      WhatsappLog.count({ where: { status: 'failed',  created_at: { [Op.gte]: since } } }).catch(() => 0),
      WhatsappLog.count({ where: { status: 'skipped', created_at: { [Op.gte]: since } } }).catch(() => 0),
    ]);

    return res.json({
      success: true,
      data: {
        ...status,
        stats_30d: { sent: sentCount, failed: failedCount, skipped: skippedCount },
      },
    });
  } catch (err) {
    console.error('[getWhatsappStatus]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /admin/whatsapp/test ─────────────────────────────────────────────────
// Body: { to: "+91XXXXXXXXXX", message: "test message" }
const sendTestMessage = async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to) return res.status(400).json({ success: false, message: '`to` phone number is required' });

    const body = message || `Dynatech ONE test message — WhatsApp notifications are working correctly!\nSent at ${new Date().toLocaleString('en-IN')}`;

    const result = await sendWhatsApp({
      to,
      body,
      type:     'TEST',
      userId:   req.user?.id,
      roleName: req.user?.Role?.name,
    });

    return res.json({
      success: result.status !== 'failed',
      data:    result,
      message: result.status === 'sent'    ? `Test message sent to ${to}`
             : result.status === 'skipped' ? 'WhatsApp not configured — message was skipped (see server .env)'
             : `Failed to send: ${result.error}`,
    });
  } catch (err) {
    console.error('[sendTestMessage]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /admin/whatsapp/logs ──────────────────────────────────────────────────
const getLogs = async (req, res) => {
  try {
    const page     = parseInt(req.query.page,     10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const where    = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.type)   where.type   = req.query.type;

    const { count, rows } = await WhatsappLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'employee_id'], required: false }],
      order:   [['created_at', 'DESC']],
      limit:   pageSize,
      offset:  (page - 1) * pageSize,
    });

    return res.json({ success: true, data: { rows, total: count, page, pageSize } });
  } catch (err) {
    console.error('[getLogs]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getWhatsappStatus, sendTestMessage, getLogs };
