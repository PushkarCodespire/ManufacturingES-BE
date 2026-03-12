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
      aiResponse = await processMessage(message, models, { role, page });
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
      limit: 50,
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
