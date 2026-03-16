const { Op }                          = require('sequelize');
const { StickerTemplate, User, Machine, Vendor } = require('../../../models');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const defaultIncludes = [
  { model: User,    as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User,    as: 'Updater', attributes: AUDIT_ATTRS },
  { model: Machine, as: 'Machine', attributes: ['id', 'name', 'code'], required: false },
];

// ─── GET /sticker-templates ────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search, template_for, is_active } = req.query;

    const where = {};
    if (template_for) where.template_for = template_for;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { name:         { [Op.iLike]: `%${search}%` } },
        { template_for: { [Op.iLike]: `%${search}%` } },
        { primary_key:  { [Op.iLike]: `%${search}%` } },
      ];
    }

    const templates = await StickerTemplate.findAll({
      where,
      include: defaultIncludes,
      order:   [['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: templates });
  } catch (err) {
    console.error('[stickerTemplate.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /sticker-templates/:id ────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const template = await StickerTemplate.findByPk(req.params.id, { include: defaultIncludes });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    return res.json({ success: true, data: template });
  } catch (err) {
    console.error('[stickerTemplate.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /sticker-templates ───────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const {
      name, template_for, machine_id, customer_ids,
      sticker_type, primary_key, secondary_key, separator,
      format, size_mm, auto_printing, zpl_code, ctq_params,
    } = req.body;

    if (!name?.trim())     return res.status(400).json({ success: false, message: 'Name is required' });
    if (!template_for)     return res.status(400).json({ success: false, message: 'Template For is required' });

    const template = await StickerTemplate.create({
      name:          name.trim(),
      template_for,
      machine_id:    machine_id    || null,
      customer_ids:  customer_ids  || [],
      sticker_type:  sticker_type  || 1,
      primary_key:   primary_key   || null,
      secondary_key: secondary_key || null,
      separator:     separator     || '/',
      format:        format        || 'Basic',
      size_mm:       size_mm       || null,
      auto_printing: auto_printing || false,
      zpl_code:      zpl_code      || null,
      ctq_params:    ctq_params    || [],
      is_active:     true,
      created_by:    req.user?.id  || null,
    });

    const full = await StickerTemplate.findByPk(template.id, { include: defaultIncludes });
    return res.status(201).json({ success: true, message: 'Sticker template created', data: full });
  } catch (err) {
    console.error('[stickerTemplate.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /sticker-templates/:id ─────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const template = await StickerTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const { id, createdAt, updatedAt, created_by, ...updateData } = req.body;
    updateData.updated_by = req.user?.id || null;

    if (updateData.name) updateData.name = updateData.name.trim();

    await template.update(updateData);

    const full = await StickerTemplate.findByPk(template.id, { include: defaultIncludes });
    return res.json({ success: true, message: 'Template updated', data: full });
  } catch (err) {
    console.error('[stickerTemplate.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /sticker-templates/:id ────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const template = await StickerTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    await template.destroy();
    return res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    console.error('[stickerTemplate.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /sticker-templates/:id/render ───────────────────────────────────────
// Body: { entity_data: { 'Machine Code': 'MC-001', ... } }
// Resolves primary/secondary keys and CTQ params against caller-supplied data,
// and substitutes placeholders in ZPL code.
const render = async (req, res) => {
  try {
    const template = await StickerTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const data = req.body.entity_data || {};

    const primaryValue   = (template.primary_key   && data[template.primary_key])   ? String(data[template.primary_key])   : '';
    const secondaryValue = (template.secondary_key && data[template.secondary_key]) ? String(data[template.secondary_key]) : '';
    const sep            = template.separator || '/';
    const qrData         = [primaryValue, secondaryValue].filter(Boolean).join(` ${sep} `);

    const ctqResolved = (template.ctq_params || []).map((p) => ({
      param_name:   p.param_name   || '',
      source_field: p.source_field || '',
      unit:         p.unit         || '',
      value:        p.source_field && data[p.source_field] != null ? String(data[p.source_field]) : '',
    }));

    let zplRendered = template.zpl_code || '';
    if (zplRendered) {
      zplRendered = zplRendered
        .replace(/\{PRIMARY_KEY\}/g,   primaryValue)
        .replace(/\{SECONDARY_KEY\}/g, secondaryValue);
      Object.entries(data).forEach(([k, v]) => {
        zplRendered = zplRendered.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''));
      });
    }

    return res.json({
      success: true,
      data: {
        primary_value:   primaryValue,
        secondary_value: secondaryValue,
        qr_data:         qrData,
        ctq_resolved:    ctqResolved,
        zpl_rendered:    zplRendered,
      },
    });
  } catch (err) {
    console.error('[stickerTemplate.render]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAll, getById, create, update, remove, render };
