const { Op } = require('sequelize');
const {
  Ncr, NcrDisposition, Item, User, WorkOrder, Capa,
} = require('../../../models');
const { notifyByRoles } = require('../../../services/notification.service');
const { validateCreateNcr, validateUpdateNcr, validateDisposition } = require('../cred/ncr.cred');
const { callClaude } = require('../../../services/ai.service');
const { generateAutoNumber } = require('../../../utils/autoNumber');

// ── Auto-number shorthand ─────────────────────────────────────────────────────
const nextNcrNo = () => generateAutoNumber(Ncr, 'ncr_no', 'NCR');

const HEADER_INCLUDE = [
  { model: Item,      as: 'Item',      attributes: ['id', 'name', 'code'] },
  { model: User,      as: 'RaisedBy',  attributes: ['id', 'name'] },
];

// ── GET /ncr ──────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, ncr_type, location_found } = req.query;
    const where = {};
    if (status)         where.status         = status;
    if (ncr_type)       where.ncr_type       = ncr_type;
    if (location_found) where.location_found = location_found;
    if (search) where[Op.or] = [
      { ncr_no:      { [Op.iLike]: `%${search}%` } },
      { defect_desc: { [Op.iLike]: `%${search}%` } },
      { lot_no:      { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Ncr.findAll({
      where,
      include: HEADER_INCLUDE,
      order:   [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ncr.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch NCRs' });
  }
};

// ── GET /ncr/:id ──────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Ncr.findByPk(req.params.id, {
      include: [
        ...HEADER_INCLUDE,
        { model: NcrDisposition, as: 'Disposition' },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'NCR not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[ncr.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch NCR' });
  }
};

// ── POST /ncr ─────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateNcr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const ncr_no = await nextNcrNo();
    const ncr = await Ncr.create({
      ...value,
      ncr_no,
      status:    'raised',
      raised_by: req.user.id,
    });

    const full = await Ncr.findByPk(ncr.id, { include: HEADER_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `NCR ${ncr_no} raised` });
  } catch (err) {
    console.error('[ncr.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create NCR' });
  }
};

// ── PATCH /ncr/:id ────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateNcr(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const ncr = await Ncr.findByPk(req.params.id);
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (ncr.status === 'closed') return res.status(400).json({ success: false, message: 'Cannot edit a closed NCR' });

    // Recalculate total_cost if qty or unit cost changed
    const qty  = value.qty_affected   !== undefined ? parseFloat(value.qty_affected)   : parseFloat(ncr.qty_affected  || 0);
    const cost = value.cost_per_unit  !== undefined ? parseFloat(value.cost_per_unit)  : parseFloat(ncr.cost_per_unit || 0);
    if (value.qty_affected !== undefined || value.cost_per_unit !== undefined) {
      value.total_cost = qty * cost;
    }

    await ncr.update(value);
    const full = await Ncr.findByPk(ncr.id, { include: [...HEADER_INCLUDE, { model: NcrDisposition, as: 'Disposition' }] });
    res.json({ success: true, data: full, message: 'NCR updated' });
  } catch (err) {
    console.error('[ncr.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update NCR' });
  }
};

// ── POST /ncr/:id/disposition — MRB decision ──────────────────────────────────
exports.addDisposition = async (req, res) => {
  try {
    const { error, value } = validateDisposition(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const record = await Ncr.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (record.status === 'closed') return res.status(400).json({ success: false, message: 'NCR is already closed' });

    // Upsert disposition
    const existing = await NcrDisposition.findOne({ where: { ncr_id: record.id } });
    let disposition;
    if (existing) {
      await existing.update({ ...value, decision_by: req.user.id, decision_date: new Date() });
      disposition = existing;
    } else {
      disposition = await NcrDisposition.create({
        ...value,
        ncr_id:        record.id,
        decision_by:   req.user.id,
        decision_date: new Date(),
      });
    }

    await record.update({ status: 'dispositioned' });

    // ── Auto-create CAPA from NCR disposition ─────────────────────────────
    let capa_no = null;
    const capaDispositions = ['rework', 'scrap', 'return_to_vendor'];
    if (capaDispositions.includes(value.disposition_type)) {
      try {
        const lastCapa = await Capa.findOne({ order: [['created_at', 'DESC']], attributes: ['capa_no'] });
        const year = new Date().getFullYear();
        const seq = lastCapa ? parseInt(lastCapa.capa_no.split('-').pop(), 10) + 1 : 1;
        capa_no = `CAPA-${year}-${String(seq).padStart(4, '0')}`;

        const capa = await Capa.create({
          capa_no,
          title: `CAPA from NCR ${record.ncr_no}`,
          description: record.defect_desc,
          item_id: record.item_id,
          source_type: 'ncr',
          source_id: record.id,
          status: 'draft',
          created_by: req.user.id,
        });
        await record.update({ capa_id: capa.id });

        notifyByRoles(
          ['quality_manager'],
          'CAPA_AUTO_CREATED',
          'CAPA Auto-Created from NCR',
          `CAPA ${capa_no} auto-created from NCR ${record.ncr_no} (disposition: ${value.disposition_type})`,
        );
      } catch (capaErr) {
        console.warn('[ncr.addDisposition] auto-CAPA warning:', capaErr.message);
      }
    }

    res.json({ success: true, data: disposition, capa_no, message: `MRB decision recorded: ${value.decision}` });
  } catch (err) {
    console.error('[ncr.addDisposition]', err);
    res.status(500).json({ success: false, message: 'Failed to record disposition' });
  }
};

// ── PATCH /ncr/:id/close ──────────────────────────────────────────────────────
exports.close = async (req, res) => {
  try {
    const ncr = await Ncr.findByPk(req.params.id);
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (ncr.status === 'closed') return res.status(400).json({ success: false, message: 'NCR is already closed' });
    if (ncr.status === 'raised') return res.status(400).json({ success: false, message: 'NCR must be dispositioned before closing' });

    await ncr.update({ status: 'closed' });
    res.json({ success: true, data: ncr, message: `NCR ${ncr.ncr_no} closed` });
  } catch (err) {
    console.error('[ncr.close]', err);
    res.status(500).json({ success: false, message: 'Failed to close NCR' });
  }
};

// ── GET /ncr/:id/ai-suggestion ────────────────────────────────────────────────
// Returns AI-generated root-cause analysis and corrective action suggestions
// for this NCR. Fetches the last 5 NCRs for the same item as historical context.
exports.getAiSuggestion = async (req, res) => {
  try {
    const ncr = await Ncr.findByPk(req.params.id, {
      include: [
        { model: Item, as: 'Item', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'RaisedBy', attributes: ['id', 'name'] },
        { model: NcrDisposition, as: 'Disposition', required: false },
      ],
    });
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });

    // Historical NCRs for same item (excluding this one)
    const history = ncr.item_id
      ? await Ncr.findAll({
          where:      { item_id: ncr.item_id, id: { [Op.ne]: ncr.id } },
          order:      [['created_at', 'DESC']],
          limit:      5,
          attributes: ['ncr_no', 'defect_desc', 'ncr_type', 'location_found', 'status', 'created_at'],
        })
      : [];

    const systemPrompt = `You are a quality engineering expert specialising in manufacturing non-conformance investigations.
Analyse the NCR data and respond ONLY with a JSON object matching this schema:
{
  "likely_root_causes": ["string", ...],
  "contributing_factors": ["string", ...],
  "recommended_corrective_actions": ["string", ...],
  "recurrence_risk": "low" | "medium" | "high",
  "confidence": "low" | "medium" | "high",
  "notes": "string"
}
Base your analysis on the defect description, NCR type, location found, and historical patterns.
Be concise and practical — each array item should be one actionable sentence.`;

    const userPrompt = `Current NCR:
- NCR No: ${ncr.ncr_no}
- Part: ${ncr.Item?.name || 'Unknown'} (${ncr.Item?.code || 'N/A'})
- Defect Description: ${ncr.defect_desc || 'Not provided'}
- NCR Type: ${ncr.ncr_type || 'Not specified'}
- Location Found: ${ncr.location_found || 'Not specified'}
- Qty Affected: ${ncr.qty_affected ?? 'Unknown'}
- Lot No: ${ncr.lot_no || 'N/A'}
- Status: ${ncr.status}

Historical NCRs for this part (last ${history.length}):
${history.length === 0
  ? 'No history found.'
  : history.map((h) =>
      `- ${h.ncr_no} | ${h.defect_desc} | ${h.ncr_type} | ${h.location_found} | ${h.status}`
    ).join('\n')}`;

    const result = await callClaude(systemPrompt, userPrompt, {
      cacheKey:   `ncr-ai-${ncr.id}`,
      cacheTtlMs: 60 * 60 * 1000, // 1 hour
    });

    return res.json({
      success:        true,
      data: {
        ncr_no:        ncr.ncr_no,
        item:          ncr.Item,
        ai_available:  result.ai_available,
        ai_cached:     result.cached,
        ai_error:      result.ai_error,
        ai_insight:    result.data,
        history_count: history.length,
      },
    });
  } catch (err) {
    console.error('[ncr.getAiSuggestion]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI suggestion' });
  }
};

// ── DELETE /ncr/:id ───────────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const ncr = await Ncr.findByPk(req.params.id);
    if (!ncr) return res.status(404).json({ success: false, message: 'NCR not found' });
    if (ncr.status !== 'raised') return res.status(400).json({ success: false, message: 'Only NCRs in "raised" status can be deleted' });

    const no = ncr.ncr_no;
    await NcrDisposition.destroy({ where: { ncr_id: ncr.id } });
    await ncr.destroy();
    res.json({ success: true, message: `NCR ${no} deleted` });
  } catch (err) {
    console.error('[ncr.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete NCR' });
  }
};
