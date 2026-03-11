const { Op } = require('sequelize');
const { CheckSheetTemplate, CheckSheetDimension, Drawing, Item, User } = require('../../../models');
const {
  validateCreateTemplate, validateUpdateTemplate, validateUpdateDimensions,
} = require('../cred/checkSheet.cred');

const BASE_INCLUDE = [
  { model: Item,    as: 'Item',    attributes: ['id', 'name', 'code'] },
  { model: Drawing, as: 'Drawing', attributes: ['id', 'drawing_no', 'title', 'current_revision'] },
  { model: User,    as: 'Creator', attributes: ['id', 'name'] },
];

// ── GET /npd/check-sheets ─────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, item_id, is_active } = req.query;
    const where = {};
    if (item_id)  where.item_id   = item_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) where[Op.or] = [
      { name:     { [Op.iLike]: `%${search}%` } },
      { revision: { [Op.iLike]: `%${search}%` } },
    ];

    const data = await CheckSheetTemplate.findAll({
      where,
      include: [
        { model: Item,    as: 'Item',    attributes: ['id', 'name', 'code'] },
        { model: Drawing, as: 'Drawing', attributes: ['id', 'drawing_no', 'current_revision'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[checkSheet.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch check-sheet templates' });
  }
};

// ── GET /npd/check-sheets/:id ─────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await CheckSheetTemplate.findByPk(req.params.id, {
      include: [
        ...BASE_INCLUDE,
        { model: CheckSheetDimension, as: 'Dimensions', order: [['sort_order', 'ASC'], ['balloon_no', 'ASC']] },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Check-sheet template not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[checkSheet.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch check-sheet template' });
  }
};

// ── POST /npd/check-sheets ────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateTemplate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { dimensions = [], ...rest } = value;

    const template = await CheckSheetTemplate.create({
      ...rest,
      is_active:  true,
      created_by: req.user.id,
    });

    if (dimensions.length) {
      await CheckSheetDimension.bulkCreate(
        dimensions.map((d, i) => ({ ...d, template_id: template.id, sort_order: d.sort_order ?? i }))
      );
    }

    const full = await CheckSheetTemplate.findByPk(template.id, {
      include: [...BASE_INCLUDE, { model: CheckSheetDimension, as: 'Dimensions', order: [['sort_order', 'ASC']] }],
    });
    res.status(201).json({ success: true, data: full, message: 'Check-sheet template created' });
  } catch (err) {
    console.error('[checkSheet.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create check-sheet template' });
  }
};

// ── PATCH /npd/check-sheets/:id ───────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateTemplate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const template = await CheckSheetTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Check-sheet template not found' });

    await template.update(value);
    const full = await CheckSheetTemplate.findByPk(template.id, {
      include: [...BASE_INCLUDE, { model: CheckSheetDimension, as: 'Dimensions', order: [['sort_order', 'ASC']] }],
    });
    res.json({ success: true, data: full, message: 'Check-sheet template updated' });
  } catch (err) {
    console.error('[checkSheet.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update check-sheet template' });
  }
};

// ── PUT /npd/check-sheets/:id/dimensions — Replace all dimensions ─────────────
exports.updateDimensions = async (req, res) => {
  try {
    const { error, value } = validateUpdateDimensions(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const template = await CheckSheetTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Check-sheet template not found' });

    await CheckSheetDimension.destroy({ where: { template_id: template.id } });
    if (value.dimensions.length) {
      await CheckSheetDimension.bulkCreate(
        value.dimensions.map((d, i) => ({ ...d, template_id: template.id, sort_order: d.sort_order ?? i }))
      );
    }

    const dims = await CheckSheetDimension.findAll({
      where: { template_id: template.id },
      order: [['sort_order', 'ASC']],
    });
    res.json({ success: true, data: dims, message: `${dims.length} dimension(s) saved` });
  } catch (err) {
    console.error('[checkSheet.updateDimensions]', err);
    res.status(500).json({ success: false, message: 'Failed to update dimensions' });
  }
};

// ── PATCH /npd/check-sheets/:id/revalidate — Reactivate after drawing review ─
exports.revalidate = async (req, res) => {
  try {
    const template = await CheckSheetTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Check-sheet template not found' });
    if (template.sheet_status !== 'invalidated') {
      return res.status(400).json({ success: false, message: 'Only invalidated check-sheets can be revalidated' });
    }

    await template.update({ sheet_status: 'reviewed', invalidated_at: null });
    res.json({ success: true, data: template, message: 'Check-sheet revalidated' });
  } catch (err) {
    console.error('[checkSheet.revalidate]', err);
    res.status(500).json({ success: false, message: 'Failed to revalidate check-sheet' });
  }
};

// ── POST /npd/check-sheets/ai/dimension-extraction ──────────────────────────
exports.aiDimensionExtraction = async (req, res) => {
  try {
    const { drawing_id, check_sheet_id } = req.body;
    const { dimensionExtraction } = require('../../../config/ai-prompts');
    const { callClaudeVision } = require('../../../services/ai.service');

    let drawingContext = 'Extract all dimensions from this engineering drawing.';
    if (drawing_id) {
      const drawing = await Drawing.findByPk(drawing_id);
      if (drawing) {
        drawingContext = `Drawing: ${drawing.drawing_no}, Rev: ${drawing.current_revision}, Title: ${drawing.title}. Extract all dimensions.`;
      }
    }

    // If a file was uploaded (multipart), use vision
    if (req.file) {
      const base64Data = req.file.buffer.toString('base64');
      const mediaType = req.file.mimetype || 'application/pdf';
      const prompt = dimensionExtraction(drawingContext);

      const result = await callClaudeVision(
        'You are a metrology expert extracting dimensions from engineering drawings.',
        base64Data,
        mediaType,
        prompt,
      );
      return res.json({ success: true, data: result, ai_available: true });
    }

    // Fallback: text-based extraction with context
    const { callClaude } = require('../../../services/ai.service');
    const prompt = dimensionExtraction(drawingContext);
    const result = await callClaude(
      'You are a metrology expert.',
      prompt,
      { cacheKey: `dims-${drawing_id || check_sheet_id}`, maxTokens: 2000 },
    );

    res.json({ success: true, data: result, ai_available: true });
  } catch (err) {
    console.error('[checkSheet.aiDimensionExtraction]', err);
    if (err.message?.includes('budget') || err.message?.includes('unavailable')) {
      return res.json({ success: true, data: null, ai_available: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'AI dimension extraction failed' });
  }
};

// ── DELETE /npd/check-sheets/:id ──────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const template = await CheckSheetTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Check-sheet template not found' });

    await CheckSheetDimension.destroy({ where: { template_id: template.id } });
    await template.destroy();
    res.json({ success: true, message: 'Check-sheet template deleted' });
  } catch (err) {
    console.error('[checkSheet.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete check-sheet template' });
  }
};
