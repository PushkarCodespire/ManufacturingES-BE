'use strict';

const models = require('../../../models');
const { MadadChat } = models;
const { processMessage } = require('../../../services/nlp-chatbot.service');

// ── POST /madad/chat ─────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, page_context, session_id } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const sid = session_id || `session-${req.user.id}-${Date.now()}`;
    const role = req.user.Role?.name || 'user';
    const page = page_context || 'unknown';

    let aiResponse;
    try {
      aiResponse = await processMessage(message, models, { role, page, sessionId: sid });
    } catch (nlpErr) {
      console.warn('[madad.chat] NLP processing failed:', nlpErr.message);
      aiResponse = 'Maaf karna, kuch gadbad ho gayi. Thodi der baad try karo.';
    }

    const record = await MadadChat.create({
      user_id:      req.user.id,
      session_id:   sid,
      role,
      user_message: message,
      ai_response:  aiResponse,
      page_context: page,
      tokens_used:  0,
    });

    res.json({
      success: true,
      data: {
        id:         record.id,
        session_id: sid,
        message:    aiResponse,
        timestamp:  record.created_at,
      },
    });
  } catch (err) {
    console.error('[madad.chat]', err);
    res.status(500).json({ success: false, message: 'Chat failed' });
  }
};

// ── GET /madad/history ──────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const { session_id } = req.query;
    const where = { user_id: req.user.id };
    if (session_id) where.session_id = session_id;

    const messages = await MadadChat.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    // Flatten: each record has user_message + ai_response → 2 chat messages
    const chatMessages = [];
    messages.reverse().forEach((m) => {
      chatMessages.push({ role: 'user', text: m.user_message, timestamp: m.created_at });
      if (m.ai_response) {
        chatMessages.push({ role: 'assistant', text: m.ai_response, timestamp: m.created_at });
      }
    });

    res.json({ success: true, data: chatMessages });
  } catch (err) {
    console.error('[madad.getHistory]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
};

// ── GET /madad/sessions ──────────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
  try {
    // Step 1: aggregate per session
    const sessionAggs = await MadadChat.findAll({
      where: { user_id: req.user.id },
      attributes: [
        'session_id',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'message_count'],
        [models.sequelize.fn('MIN', models.sequelize.col('created_at')), 'started_at'],
        [models.sequelize.fn('MAX', models.sequelize.col('created_at')), 'last_at'],
      ],
      group: ['session_id'],
      order: [[models.sequelize.fn('MAX', models.sequelize.col('created_at')), 'DESC']],
      limit: 60,
      raw: true,
    });

    if (!sessionAggs.length) return res.json({ success: true, data: [] });

    // Step 2: get first user_message per session (for preview)
    const sessionIds = sessionAggs.map((s) => s.session_id);
    const firstMsgs = await MadadChat.findAll({
      where: { user_id: req.user.id, session_id: sessionIds },
      attributes: ['session_id', 'user_message'],
      order: [['created_at', 'ASC']],
      raw: true,
    });

    const firstMsgMap = {};
    for (const m of firstMsgs) {
      if (!firstMsgMap[m.session_id]) firstMsgMap[m.session_id] = m.user_message;
    }

    const sessions = sessionAggs.map((s) => ({
      session_id:    s.session_id,
      first_message: firstMsgMap[s.session_id] || 'New conversation',
      started_at:    s.started_at,
      last_at:       s.last_at,
      message_count: parseInt(s.message_count, 10),
    }));

    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[madad.getSessions]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};
