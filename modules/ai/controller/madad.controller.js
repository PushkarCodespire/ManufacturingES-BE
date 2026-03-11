'use strict';
const { MadadChat } = require('../../../models');
const { callClaude } = require('../../../services/ai.service');

const MADAD_SYSTEM_PROMPT = `You are Madad, a friendly AI assistant for Dynatech One — a factory operations platform for automotive manufacturing.

Guidelines:
- You support Hinglish (Hindi + English mix), Hindi, and English
- Be concise and practical — factory workers need quick answers
- Reference specific modules when relevant (IQC, PQC, OQC, Production, Store, etc.)
- If unsure, say so honestly — don't make up data
- Keep responses under 200 words unless the user asks for detail
- Use simple language — avoid jargon unless the user uses it first

Context: The user is a {ROLE} currently on the {PAGE} page.`;

// ── POST /madad/chat ─────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, page_context, session_id } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const sid = session_id || `session-${req.user.id}-${Date.now()}`;
    const role = req.user.Role?.name || 'user';
    const page = page_context || 'unknown';

    const systemPrompt = MADAD_SYSTEM_PROMPT
      .replace('{ROLE}', role)
      .replace('{PAGE}', page);

    // Load last 5 messages for context
    const history = await MadadChat.findAll({
      where: { session_id: sid },
      order: [['created_at', 'DESC']],
      limit: 5,
    });

    const conversationContext = history
      .reverse()
      .map((m) => `User: ${m.user_message}\nMadad: ${m.ai_response}`)
      .join('\n\n');

    const userPrompt = conversationContext
      ? `Previous conversation:\n${conversationContext}\n\nNew message: ${message}`
      : message;

    let aiResponse = 'Sorry, AI is temporarily unavailable. Please try again.';
    let tokensUsed = 0;

    try {
      const result = await callClaude(systemPrompt, userPrompt, {
        cacheKey: null,
        maxTokens: 500,
      });
      if (result && typeof result === 'object') {
        aiResponse = result.text || result.content || JSON.stringify(result);
        tokensUsed = result.usage?.output_tokens || 0;
      } else if (typeof result === 'string') {
        aiResponse = result;
      }
    } catch (aiErr) {
      console.warn('[madad.chat] AI call failed:', aiErr.message);
    }

    const record = await MadadChat.create({
      user_id:      req.user.id,
      session_id:   sid,
      role,
      user_message: message,
      ai_response:  aiResponse,
      page_context: page,
      tokens_used:  tokensUsed,
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

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    console.error('[madad.getHistory]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
};
