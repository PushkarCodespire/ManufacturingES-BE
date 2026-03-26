'use strict';

const { Op } = require('sequelize');
const { User, Role, Notification } = require('../models');

// Notification types that also trigger a WhatsApp message (when configured)
const WHATSAPP_CRITICAL_TYPES = new Set([
  'BREAKDOWN',
  'ACCOUNT_LOCKED',
  'TALLY_SYNC_ERRORS',
  'MOLD_LIFE_CRITICAL',
  'MOLD_LIFE_URGENT',
  'MAINTENANCE_OVERDUE',
  'LOW_STOCK_CRITICAL',
]);

/**
 * Notify all users that have any of the given role names.
 * Non-fatal — errors are logged but never thrown.
 *
 * @param {string[]} roleNames - e.g. ['quality_manager', 'iqc_inspector']
 * @param {string}   type      - notification type constant
 * @param {string}   title     - short title
 * @param {string}   message   - detail body
 */
async function notifyByRoles(roleNames, type, title, message) {
  try {
    const targets = await User.findAll({
      include: [{ model: Role, where: { name: { [Op.in]: roleNames } } }],
      attributes: ['id'],
    });
    if (targets.length) {
      await Notification.bulkCreate(
        targets.map((u) => ({ user_id: u.id, type, title, message })),
      );
    }

    // For critical types, also send WhatsApp (non-blocking)
    if (WHATSAPP_CRITICAL_TYPES.has(type)) {
      const { notifyByRolesWhatsApp } = require('./whatsapp.service');
      notifyByRolesWhatsApp(roleNames, type, title, message).catch(() => {});
    }
  } catch (err) {
    console.warn('[notification.service] notifyByRoles error (non-fatal):', err.message);
  }
}

module.exports = { notifyByRoles };
