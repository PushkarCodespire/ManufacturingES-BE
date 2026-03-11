'use strict';

const { Op } = require('sequelize');
const { User, Role, Notification } = require('../models');

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
  } catch (err) {
    console.warn('[notification.service] notifyByRoles error (non-fatal):', err.message);
  }
}

module.exports = { notifyByRoles };
