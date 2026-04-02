'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// ── Configuration ───────────────────────────────────────────────────────────
const AI_ENABLED       = process.env.AI_ENABLED === 'true';
const MODEL            = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
const VISION_MODEL     = process.env.AI_VISION_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS       = parseInt(process.env.AI_MAX_TOKENS, 10) || 2048;
const BUDGET_CENTS     = parseInt(process.env.AI_MONTHLY_BUDGET_CENTS, 10) || 1500;

// Pricing per 1M tokens (USD cents)
const PRICING = {
  'claude-haiku-4-5-20251001': { input: 100, output: 500 },
  'claude-haiku-4-5':          { input: 100, output: 500 },
  'claude-sonnet-4-6':         { input: 300, output: 1500 },
};

// ── Lazy client ─────────────────────────────────────────────────────────────
let _client = null;

function getClient() {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ── In-memory TTL cache ─────────────────────────────────────────────────────
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Periodic cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _cache) {
    if (now > v.expiresAt) _cache.delete(k);
  }
}, 10 * 60 * 1000).unref();

// ── Monthly budget tracking ─────────────────────────────────────────────────
const _usage = {
  month: new Date().getMonth(),
  year:  new Date().getFullYear(),
  totalCents: 0,
  calls: 0,
};

function resetIfNewMonth() {
  const now = new Date();
  if (now.getMonth() !== _usage.month || now.getFullYear() !== _usage.year) {
    _usage.month      = now.getMonth();
    _usage.year       = now.getFullYear();
    _usage.totalCents = 0;
    _usage.calls      = 0;
  }
}

// Infer agent from caller stack trace
function inferAgentKey() {
  const stack = new Error().stack || '';
  if (stack.includes('maintenanceAi'))   return 'maintenance';
  if (stack.includes('madad'))           return 'general_madad';
  if (stack.includes('capa'))            return 'quality_analyst';
  if (stack.includes('ncr'))             return 'quality_analyst';
  if (stack.includes('complaint'))       return 'quality_analyst';
  if (stack.includes('instrument'))      return 'quality_analyst';
  if (stack.includes('oqc'))             return 'quality_analyst';
  if (stack.includes('pqc'))             return 'quality_analyst';
  if (stack.includes('iqc'))             return 'iqc_advisor';
  if (stack.includes('purchaseOrder'))   return 'procurement_agent';
  if (stack.includes('rfq'))             return 'procurement_agent';
  if (stack.includes('scar'))            return 'procurement_agent';
  if (stack.includes('quotation'))       return 'procurement_agent';
  if (stack.includes('customerOrder'))   return 'procurement_agent';
  if (stack.includes('inventory'))       return 'store_optimizer';
  if (stack.includes('grn'))             return 'store_optimizer';
  if (stack.includes('production'))      return 'production_planner';
  if (stack.includes('workOrder'))       return 'production_planner';
  if (stack.includes('pfmea'))           return 'npd_assistant';
  if (stack.includes('drawing'))         return 'npd_assistant';
  if (stack.includes('checkSheet'))      return 'npd_assistant';
  if (stack.includes('copq'))            return 'quality_analyst';
  if (stack.includes('mrm'))             return 'quality_analyst';
  if (stack.includes('training'))        return 'general_madad';
  return 'unknown';
}

function trackUsage(model, inputTokens, outputTokens, context = {}) {
  resetIfNewMonth();
  const price = PRICING[model] || PRICING['claude-haiku-4-5'];
  const costCents = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  _usage.totalCents += costCents;
  _usage.calls += 1;

  const agentKey = context.agentKey || inferAgentKey();

  // Persist to database (fire-and-forget)
  try {
    const db = require('../models');
    if (db.AiUsageLog) {
      db.AiUsageLog.create({
        user_id:       context.userId || null,
        agent_key:     agentKey,
        model,
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
        cost_cents:    Math.round(costCents * 10000) / 10000,
        endpoint:      context.endpoint || null,
        cached:        false,
      }).catch(err => console.error('[ai.service] Failed to log usage:', err.message));
    }
  } catch (e) {
    // models not ready yet — ignore
  }
}

function isBudgetExceeded() {
  resetIfNewMonth();
  return _usage.totalCents >= BUDGET_CENTS;
}

// ── Availability check ──────────────────────────────────────────────────────
function isAvailable() {
  return AI_ENABLED && !!process.env.ANTHROPIC_API_KEY && !isBudgetExceeded();
}

// ── Core: callClaude ────────────────────────────────────────────────────────
/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} [options]
 * @param {string} [options.model]      - override model
 * @param {number} [options.maxTokens]  - override max_tokens
 * @param {string} [options.cacheKey]   - enable caching
 * @param {number} [options.cacheTtlMs] - cache TTL in ms (default 15 min)
 * @param {string} [options.agentKey]   - AI agent identifier for cost tracking
 * @param {string} [options.endpoint]   - API endpoint for cost tracking
 * @param {number} [options.userId]     - user ID for cost tracking
 * @returns {Promise<{ai_available: boolean, data: object|null, ai_error: string|null, cached: boolean}>}
 */
async function callClaude(systemPrompt, userPrompt, options = {}) {
  if (!isAvailable()) {
    return { ai_available: false, data: null, ai_error: 'AI not available', cached: false };
  }

  // Check cache
  const cacheKey = options.cacheKey || null;
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return { ai_available: true, data: cached, ai_error: null, cached: true };
  }

  const client = getClient();
  if (!client) {
    return { ai_available: false, data: null, ai_error: 'API key missing', cached: false };
  }

  const model     = options.model || MODEL;
  const maxTokens = options.maxTokens || MAX_TOKENS;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    trackUsage(model, response.usage.input_tokens, response.usage.output_tokens, {
      userId:   options.userId,
      agentKey: options.agentKey,
      endpoint: options.endpoint,
    });

    // Extract text
    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock?.text || '';

    // Try to parse JSON — extract from markdown code fence if present
    // Use match() to grab content BETWEEN fences, ignoring any trailing text after the block
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]+?)```/i);
    const stripped = fenceMatch ? fenceMatch[1].trim() : raw.trim();
    let data;
    try {
      data = JSON.parse(stripped);
    } catch {
      data = { raw_text: raw };
    }

    // Cache result
    if (cacheKey) {
      cacheSet(cacheKey, data, options.cacheTtlMs || 15 * 60 * 1000);
    }

    return { ai_available: true, data, ai_error: null, cached: false };
  } catch (err) {
    console.error('[ai.service] callClaude error:', err.message);
    return { ai_available: true, data: null, ai_error: err.message, cached: false };
  }
}

// ── Core: callClaudeVision ──────────────────────────────────────────────────
/**
 * @param {string} systemPrompt
 * @param {string} base64Data       - base64 encoded image/PDF page
 * @param {string} mediaType        - e.g. 'image/png', 'image/jpeg', 'application/pdf'
 * @param {string} textPrompt       - user text alongside the image
 * @param {object} [options]
 * @returns {Promise<{ai_available: boolean, data: object|null, ai_error: string|null}>}
 */
async function callClaudeVision(systemPrompt, base64Data, mediaType, textPrompt, options = {}) {
  if (!isAvailable()) {
    return { ai_available: false, data: null, ai_error: 'AI not available' };
  }

  const client = getClient();
  if (!client) {
    return { ai_available: false, data: null, ai_error: 'API key missing' };
  }

  const model     = options.model || VISION_MODEL;
  const maxTokens = options.maxTokens || MAX_TOKENS;

  // Build content blocks based on media type
  const contentBlocks = [];

  if (mediaType === 'application/pdf') {
    contentBlocks.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
    });
  } else {
    contentBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64Data },
    });
  }

  contentBlocks.push({ type: 'text', text: textPrompt });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    trackUsage(model, response.usage.input_tokens, response.usage.output_tokens, {
      userId:   options.userId,
      agentKey: options.agentKey,
      endpoint: options.endpoint,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock?.text || '';

    // Try to parse JSON — extract from markdown code fence if present
    // Use match() to grab content BETWEEN fences, ignoring any trailing text after the block
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]+?)```/i);
    const stripped = fenceMatch ? fenceMatch[1].trim() : raw.trim();
    let data;
    try {
      data = JSON.parse(stripped);
    } catch {
      data = { raw_text: raw };
    }

    return { ai_available: true, data, ai_error: null };
  } catch (err) {
    console.error('[ai.service] callClaudeVision error:', err.message);
    return { ai_available: true, data: null, ai_error: err.message };
  }
}

// ── Usage stats ─────────────────────────────────────────────────────────────
function getUsageStats() {
  resetIfNewMonth();
  return {
    month:           `${_usage.year}-${String(_usage.month + 1).padStart(2, '0')}`,
    totalCostCents:  Math.round(_usage.totalCents * 100) / 100,
    budgetCents:     BUDGET_CENTS,
    budgetRemaining: Math.round((BUDGET_CENTS - _usage.totalCents) * 100) / 100,
    calls:           _usage.calls,
    budgetExceeded:  isBudgetExceeded(),
    ai_enabled:      AI_ENABLED,
  };
}

module.exports = {
  callClaude,
  callClaudeVision,
  isAvailable,
  getUsageStats,
};
