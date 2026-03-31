const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured — SMTP_HOST, SMTP_USER, SMTP_PASS required');
    return null;
  }

  // Port 465 = SSL (secure:true), Port 587 = STARTTLS (secure:false)
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    ...(secure ? {} : { tls: { rejectUnauthorized: false } }),
  });

  return transporter;
}

/**
 * Send an email
 * @param {Object} opts
 * @param {string|string[]} opts.to - Recipient email(s)
 * @param {string} opts.subject - Email subject
 * @param {string} opts.html - HTML body
 * @param {string} [opts.text] - Plain text fallback
 * @param {Array}  [opts.attachments] - Nodemailer attachments [{filename, content, contentType}]
 * @returns {Promise<Object>} - Nodemailer send result
 */
async function sendEmail({ to, subject, html, text, attachments = [] }) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const info = await t.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text: text || subject,
    attachments,
  });

  console.log(`[Email] Sent to ${to} — messageId: ${info.messageId}`);
  return info;
}

module.exports = { sendEmail, getTransporter };
