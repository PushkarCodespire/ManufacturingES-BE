const { Op } = require('sequelize');
const { Pfmea, PfmeaItem, PfmeaAction, Drawing, Item, User } = require('../../../models');
const {
  validateCreatePfmea, validateUpdatePfmea,
  validatePfmeaItem, validateUpdatePfmeaItem,
  validatePfmeaAction, validateUpdatePfmeaAction,
} = require('../cred/pfmea.cred');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Auto-number shorthand ─────────────────────────────────────────────────────
const nextPfmeaNo = () => generateAutoNumber(Pfmea, 'pfmea_no', 'PFMEA');

const BASE_INCLUDE = [
  { model: Item,    as: 'Item',    attributes: ['id', 'name', 'code'] },
  { model: Drawing, as: 'Drawing', attributes: ['id', 'drawing_no', 'title', 'current_revision'] },
  { model: User,    as: 'Creator', attributes: ['id', 'name'] },
];

// ── GET /npd/pfmea ────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, item_id } = req.query;
    const where = {};
    if (status)  where.status  = status;
    if (item_id) where.item_id = item_id;
    if (search) where[Op.or] = [
      { pfmea_no: { [Op.iLike]: `%${search}%` } },
      { title:    { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Pfmea.findAll({
      where,
      include: [{ model: Item, as: 'Item', attributes: ['id', 'name', 'code'] }],
      order:   [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[pfmea.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch PFMEAs' });
  }
};

// ── GET /npd/pfmea/:id ────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Pfmea.findByPk(req.params.id, {
      include: [
        ...BASE_INCLUDE,
        {
          model:   PfmeaItem,
          as:      'Items',
          include: [{ model: PfmeaAction, as: 'Actions' }],
          order:   [['sort_order', 'ASC']],
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'PFMEA not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[pfmea.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch PFMEA' });
  }
};

// ── POST /npd/pfmea ───────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreatePfmea(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const pfmea_no = await nextPfmeaNo();
    const pfmea = await Pfmea.create({
      ...value,
      pfmea_no,
      status:     'draft',
      created_by: req.user.id,
    });

    const full = await Pfmea.findByPk(pfmea.id, { include: BASE_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `PFMEA ${pfmea_no} created` });
  } catch (err) {
    console.error('[pfmea.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create PFMEA' });
  }
};

// ── PATCH /npd/pfmea/:id ──────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdatePfmea(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const pfmea = await Pfmea.findByPk(req.params.id);
    if (!pfmea) return res.status(404).json({ success: false, message: 'PFMEA not found' });
    if (pfmea.status === 'obsolete') return res.status(400).json({ success: false, message: 'Cannot edit an obsolete PFMEA' });

    await pfmea.update(value);
    const full = await Pfmea.findByPk(pfmea.id, { include: BASE_INCLUDE });
    res.json({ success: true, data: full, message: 'PFMEA updated' });
  } catch (err) {
    console.error('[pfmea.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update PFMEA' });
  }
};

// ── POST /npd/pfmea/:id/items — Add process step ──────────────────────────────
exports.addItem = async (req, res) => {
  try {
    const { error, value } = validatePfmeaItem(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const pfmea = await Pfmea.findByPk(req.params.id);
    if (!pfmea) return res.status(404).json({ success: false, message: 'PFMEA not found' });

    // Auto-calculate AP = S × O × D
    const ap = value.severity * value.occurrence * value.detection;
    const item = await PfmeaItem.create({ ...value, pfmea_id: pfmea.id, action_priority: ap });

    res.status(201).json({ success: true, data: item, message: 'PFMEA item added' });
  } catch (err) {
    console.error('[pfmea.addItem]', err);
    res.status(500).json({ success: false, message: 'Failed to add PFMEA item' });
  }
};

// ── PATCH /npd/pfmea/items/:itemId ────────────────────────────────────────────
exports.updateItem = async (req, res) => {
  try {
    const { error, value } = validateUpdatePfmeaItem(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const item = await PfmeaItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'PFMEA item not found' });

    // Recalculate AP if any rating changed
    const s = value.severity   ?? item.severity;
    const o = value.occurrence ?? item.occurrence;
    const d = value.detection  ?? item.detection;
    value.action_priority = s * o * d;

    await item.update(value);
    res.json({ success: true, data: item, message: 'PFMEA item updated' });
  } catch (err) {
    console.error('[pfmea.updateItem]', err);
    res.status(500).json({ success: false, message: 'Failed to update PFMEA item' });
  }
};

// ── DELETE /npd/pfmea/items/:itemId ───────────────────────────────────────────
exports.deleteItem = async (req, res) => {
  try {
    const item = await PfmeaItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'PFMEA item not found' });

    await PfmeaAction.destroy({ where: { pfmea_item_id: item.id } });
    await item.destroy();
    res.json({ success: true, message: 'PFMEA item deleted' });
  } catch (err) {
    console.error('[pfmea.deleteItem]', err);
    res.status(500).json({ success: false, message: 'Failed to delete PFMEA item' });
  }
};

// ── POST /npd/pfmea/items/:itemId/actions ─────────────────────────────────────
exports.addAction = async (req, res) => {
  try {
    const { error, value } = validatePfmeaAction(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const item = await PfmeaItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'PFMEA item not found' });

    // Auto-calculate AP after action if all ratings provided
    let ap_after = null;
    if (value.severity_after && value.occurrence_after && value.detection_after) {
      ap_after = value.severity_after * value.occurrence_after * value.detection_after;
    }

    const action = await PfmeaAction.create({
      ...value,
      pfmea_item_id: item.id,
      ap_after,
      status: 'open',
    });

    res.status(201).json({ success: true, data: action, message: 'PFMEA action added' });
  } catch (err) {
    console.error('[pfmea.addAction]', err);
    res.status(500).json({ success: false, message: 'Failed to add PFMEA action' });
  }
};

// ── PATCH /npd/pfmea/actions/:actionId ────────────────────────────────────────
exports.updateAction = async (req, res) => {
  try {
    const { error, value } = validateUpdatePfmeaAction(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const action = await PfmeaAction.findByPk(req.params.actionId);
    if (!action) return res.status(404).json({ success: false, message: 'PFMEA action not found' });

    // Recalculate AP after if any after-rating changed
    const s = value.severity_after   ?? action.severity_after;
    const o = value.occurrence_after ?? action.occurrence_after;
    const d = value.detection_after  ?? action.detection_after;
    if (s && o && d) value.ap_after = s * o * d;

    await action.update(value);
    res.json({ success: true, data: action, message: 'PFMEA action updated' });
  } catch (err) {
    console.error('[pfmea.updateAction]', err);
    res.status(500).json({ success: false, message: 'Failed to update PFMEA action' });
  }
};

// ── POST /npd/pfmea/:id/ai/failure-mode-suggestion ──────────────────────────
exports.aiFailureModeSuggestion = async (req, res) => {
  try {
    const pfmea = await Pfmea.findByPk(req.params.id, {
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
        { model: PfmeaItem, as: 'Items', include: [{ model: PfmeaAction, as: 'Actions' }] },
      ],
    });
    if (!pfmea) return res.status(404).json({ success: false, message: 'PFMEA not found' });

    const { failureModeSuggestion } = require('../../../config/ai-prompts');
    const { callClaude } = require('../../../services/ai.service');

    const processStep = req.body.process_step || pfmea.process_name || '';
    const material = pfmea.Item?.name || '';
    const historicalItems = (pfmea.Items || []).map((i) => ({
      process_step: i.process_step,
      failure_mode: i.failure_mode,
      severity: i.severity,
      occurrence: i.occurrence,
      detection: i.detection,
    }));

    const prompt = failureModeSuggestion(processStep, material, historicalItems);
    const result = await callClaude(
      prompt.system,
      prompt.user,
      { cacheKey: `pfmea-fm-${pfmea.id}-${processStep}`, maxTokens: 2000 },
    );

    res.json({ success: true, data: result, ai_available: true });
  } catch (err) {
    console.error('[pfmea.aiFailureModeSuggestion]', err);
    if (err.message?.includes('budget') || err.message?.includes('unavailable')) {
      return res.json({ success: true, data: null, ai_available: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'AI failure mode suggestion failed' });
  }
};

// ── DELETE /npd/pfmea/:id ─────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const pfmea = await Pfmea.findByPk(req.params.id, {
      include: [{ model: PfmeaItem, as: 'Items' }],
    });
    if (!pfmea) return res.status(404).json({ success: false, message: 'PFMEA not found' });
    if (pfmea.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft PFMEAs can be deleted' });

    for (const item of pfmea.Items) {
      await PfmeaAction.destroy({ where: { pfmea_item_id: item.id } });
    }
    await PfmeaItem.destroy({ where: { pfmea_id: pfmea.id } });
    await pfmea.destroy();

    res.json({ success: true, message: `PFMEA ${pfmea.pfmea_no} deleted` });
  } catch (err) {
    console.error('[pfmea.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete PFMEA' });
  }
};
