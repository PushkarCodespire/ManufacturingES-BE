'use strict';

/**
 * WhatsApp Notification Service
 *
 * Sends WhatsApp messages via Twilio's WhatsApp sandbox / Business API.
 * Credentials are read from environment variables (never stored in DB):
 *
 *   TWILIO_ACCOUNT_SID   — Twilio Account SID
 *   TWILIO_AUTH_TOKEN    — Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM — sender number  e.g. whatsapp:+14155238886
 *
 * When any of these is missing, the service is in "disabled" mode and every
 * sendWhatsApp() call records a 'skipped' log entry.
 */

const { Op } = require('sequelize');

// Lazy-load twilio only when credentials are present (avoids crash on boot)
let twilioClient = null;
function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    const Twilio = require('twilio');
    twilioClient = new Twilio(sid, token);
  } catch {
    // twilio package not installed — will run in stub mode
  }
  return twilioClient;
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns the current WhatsApp service status.
 */
function getStatus() {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const configured = !!(sid && process.env.TWILIO_AUTH_TOKEN && from);
  return {
    configured,
    from_number: configured ? from : null,
    account_sid_hint: sid ? `${sid.slice(0, 6)}…` : null,
    note: configured
      ? 'Twilio credentials present — WhatsApp delivery active'
      : 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env to enable WhatsApp delivery',
  };
}

/**
 * Send a WhatsApp message to a single phone number and log the result.
 *
 * @param {object} opts
 * @param {string}  opts.to         – E.164 phone number e.g. "+919876543210"
 * @param {string}  opts.body       – Message text
 * @param {string}  opts.type       – Notification type constant
 * @param {number}  [opts.userId]   – user_id for the log
 * @param {string}  [opts.roleName] – role_name for the log
 */
async function sendWhatsApp({ to, body, type, userId, roleName }) {
  const { WhatsappLog } = require('../models');

  const from = process.env.TWILIO_WHATSAPP_FROM;
  const client = getTwilio();

  if (!client || !from) {
    // Not configured — log as skipped, do not crash
    await WhatsappLog.create({
      to_number: to,
      user_id:   userId || null,
      role_name: roleName || null,
      type,
      message:   body,
      status:    'skipped',
      error_msg: 'Twilio not configured — set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM',
    }).catch(() => {});
    return { status: 'skipped' };
  }

  try {
    await client.messages.create({
      from: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
      to:   `whatsapp:${to}`,
      body,
    });

    await WhatsappLog.create({
      to_number: to,
      user_id:   userId || null,
      role_name: roleName || null,
      type,
      message:   body,
      status:    'sent',
    }).catch(() => {});

    return { status: 'sent' };
  } catch (err) {
    await WhatsappLog.create({
      to_number: to,
      user_id:   userId || null,
      role_name: roleName || null,
      type,
      message:   body,
      status:    'failed',
      error_msg: err.message,
    }).catch(() => {});

    return { status: 'failed', error: err.message };
  }
}

/**
 * Notify all users with any of the given role names via WhatsApp.
 * Sends only to users who have a phone number set on their profile.
 * Non-fatal — errors are swallowed.
 *
 * @param {string[]} roleNames
 * @param {string}   type
 * @param {string}   title
 * @param {string}   message
 */
async function notifyByRolesWhatsApp(roleNames, type, title, message) {
  try {
    const { User, Role } = require('../models');
    const targets = await User.findAll({
      include: [{ model: Role, where: { name: { [Op.in]: roleNames } } }],
      attributes: ['id', 'phone'],
      where: { phone: { [Op.ne]: null } },
    });

    const body = `*${title}*\n${message}\n\n_Dynatech ONE Alerts_`;

    await Promise.allSettled(
      targets
        .filter((u) => u.phone)
        .map((u) =>
          sendWhatsApp({
            to:       u.phone,
            body,
            type,
            userId:   u.id,
          }),
        ),
    );
  } catch (err) {
    console.warn('[whatsapp.service] notifyByRolesWhatsApp error (non-fatal):', err.message);
  }
}

module.exports = { getStatus, sendWhatsApp, notifyByRolesWhatsApp };
