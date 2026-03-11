const { Op } = require('sequelize');
const {
  Capa, CapaTeam, CapaRootCause, CapaFishbone, CapaAction, CapaEffectiveness, User, Item,
} = require('../../../models');
const {
  validateCreateCapa, validateD4, validateD5D6, validateEffectiveness, validateUpdateCapa,
} = require('../cred/capa.cred');

// ── Auto-number ───────────────────────────────────────────────────────────────
async function nextCapaNo() {
  const year   = new Date().getFullYear();
  const prefix = `CAPA-${year}-`;
  const last   = await Capa.findOne({
    where:      { capa_no: { [Op.like]: `${prefix}%` } },
    order:      [['capa_no', 'DESC']],
    attributes: ['capa_no'],
  });
  const seq = last ? parseInt(last.capa_no.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Full CAPA include ─────────────────────────────────────────────────────────
const FULL_INCLUDE = [
  { model: CapaTeam,          as: 'Team',        include: [{ model: User, as: 'TeamMember', attributes: ['id', 'name', 'employee_id'] }] },
  { model: CapaRootCause,     as: 'RootCauses',  order: [['why_level', 'ASC']] },
  { model: CapaFishbone,      as: 'Fishbone' },
  { model: CapaAction,        as: 'Actions' },
  { model: CapaEffectiveness, as: 'Effectiveness' },
  { model: User,              as: 'Champion',    attributes: ['id', 'name', 'employee_id'] },
  { model: User,              as: 'Creator',     attributes: ['id', 'name'] },
];

// ── GET /capa ─────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { search, status, source_type } = req.query;
    const where = {};
    if (status)      where.status      = status;
    if (source_type) where.source_type = source_type;
    if (search) where[Op.or] = [
      { capa_no:       { [Op.iLike]: `%${search}%` } },
      { problem_title: { [Op.iLike]: `%${search}%` } },
    ];

    const data = await Capa.findAll({
      where,
      include: [
        { model: User, as: 'Champion', attributes: ['id', 'name'] },
        { model: User, as: 'Creator',  attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[capa.getAll]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch CAPAs' });
  }
};

// ── GET /capa/:id ─────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const row = await Capa.findByPk(req.params.id, { include: FULL_INCLUDE });
    if (!row) return res.status(404).json({ success: false, message: 'CAPA not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[capa.getById]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch CAPA' });
  }
};

// ── POST /capa ────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { error, value } = validateCreateCapa(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { team_members = [], ...rest } = value;
    const capa_no = await nextCapaNo();

    const capa = await Capa.create({
      ...rest,
      capa_no,
      status:     'draft',
      created_by: req.user.id,
    });

    if (team_members.length) {
      await CapaTeam.bulkCreate(
        team_members.map(m => ({ ...m, capa_id: capa.id }))
      );
    }

    const full = await Capa.findByPk(capa.id, { include: FULL_INCLUDE });
    res.status(201).json({ success: true, data: full, message: `CAPA ${capa_no} created` });
  } catch (err) {
    console.error('[capa.create]', err);
    res.status(500).json({ success: false, message: 'Failed to create CAPA' });
  }
};

// ── PATCH /capa/:id ───────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { error, value } = validateUpdateCapa(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const capa = await Capa.findByPk(req.params.id);
    if (!capa) return res.status(404).json({ success: false, message: 'CAPA not found' });
    if (capa.status === 'closed') return res.status(400).json({ success: false, message: 'Cannot edit a closed CAPA' });

    await capa.update(value);
    const full = await Capa.findByPk(capa.id, { include: FULL_INCLUDE });
    res.json({ success: true, data: full, message: 'CAPA updated' });
  } catch (err) {
    console.error('[capa.update]', err);
    res.status(500).json({ success: false, message: 'Failed to update CAPA' });
  }
};

// ── PUT /capa/:id/d4 — Root Causes + Fishbone ──────────────────────────────────
exports.updateD4 = async (req, res) => {
  try {
    const { error, value } = validateD4(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const capa = await Capa.findByPk(req.params.id);
    if (!capa) return res.status(404).json({ success: false, message: 'CAPA not found' });

    const { root_causes = [], fishbone = [], containment_action, containment_date } = value;

    // Update containment fields if provided
    const patch = {};
    if (containment_action !== undefined) patch.containment_action = containment_action;
    if (containment_date   !== undefined) patch.containment_date   = containment_date;
    if (Object.keys(patch).length) await capa.update({ ...patch, status: capa.status === 'draft' ? 'd4_in_progress' : capa.status });

    // Replace root causes
    if (root_causes.length || req.body.root_causes !== undefined) {
      await CapaRootCause.destroy({ where: { capa_id: capa.id } });
      if (root_causes.length) {
        await CapaRootCause.bulkCreate(root_causes.map(rc => ({ ...rc, capa_id: capa.id })));
      }
    }

    // Replace fishbone entries
    if (fishbone.length || req.body.fishbone !== undefined) {
      await CapaFishbone.destroy({ where: { capa_id: capa.id } });
      if (fishbone.length) {
        await CapaFishbone.bulkCreate(fishbone.map(fb => ({ ...fb, capa_id: capa.id })));
      }
    }

    const full = await Capa.findByPk(capa.id, { include: FULL_INCLUDE });
    res.json({ success: true, data: full, message: 'D4 root cause analysis saved' });
  } catch (err) {
    console.error('[capa.updateD4]', err);
    res.status(500).json({ success: false, message: 'Failed to save D4 data' });
  }
};

// ── PUT /capa/:id/d5d6 — Actions ──────────────────────────────────────────────
exports.updateD5D6 = async (req, res) => {
  try {
    const { error, value } = validateD5D6(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const capa = await Capa.findByPk(req.params.id);
    if (!capa) return res.status(404).json({ success: false, message: 'CAPA not found' });

    const { actions = [], prevention_action } = value;

    if (prevention_action !== undefined) {
      await capa.update({ prevention_action, status: capa.status === 'draft' || capa.status === 'd4_in_progress' ? 'd5d6_in_progress' : capa.status });
    }

    if (actions.length || req.body.actions !== undefined) {
      await CapaAction.destroy({ where: { capa_id: capa.id } });
      if (actions.length) {
        await CapaAction.bulkCreate(actions.map(a => ({ ...a, capa_id: capa.id })));
      }
    }

    const full = await Capa.findByPk(capa.id, { include: FULL_INCLUDE });
    res.json({ success: true, data: full, message: 'D5/D6 actions saved' });
  } catch (err) {
    console.error('[capa.updateD5D6]', err);
    res.status(500).json({ success: false, message: 'Failed to save D5/D6 data' });
  }
};

// ── POST /capa/:id/effectiveness ──────────────────────────────────────────────
exports.addEffectiveness = async (req, res) => {
  try {
    const { error, value } = validateEffectiveness(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const capa = await Capa.findByPk(req.params.id);
    if (!capa) return res.status(404).json({ success: false, message: 'CAPA not found' });

    const record = await CapaEffectiveness.create({
      ...value,
      capa_id:    capa.id,
      checked_by: req.user.id,
    });

    res.status(201).json({ success: true, data: record, message: `Effectiveness check (${value.check_period}d) recorded` });
  } catch (err) {
    console.error('[capa.addEffectiveness]', err);
    res.status(500).json({ success: false, message: 'Failed to record effectiveness check' });
  }
};

// ── PATCH /capa/:id/close ─────────────────────────────────────────────────────
exports.close = async (req, res) => {
  try {
    const capa = await Capa.findByPk(req.params.id);
    if (!capa) return res.status(404).json({ success: false, message: 'CAPA not found' });
    if (capa.status === 'closed') return res.status(400).json({ success: false, message: 'CAPA is already closed' });

    const { closure_notes } = req.body;
    await capa.update({
      status:        'closed',
      closure_notes: closure_notes || capa.closure_notes,
      closed_at:     new Date(),
      closed_by:     req.user.id,
    });

    res.json({ success: true, data: capa, message: `CAPA ${capa.capa_no} closed` });
  } catch (err) {
    console.error('[capa.close]', err);
    res.status(500).json({ success: false, message: 'Failed to close CAPA' });
  }
};

// ── DELETE /capa/:id ──────────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const capa = await Capa.findByPk(req.params.id);
    if (!capa) return res.status(404).json({ success: false, message: 'CAPA not found' });
    if (capa.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft CAPAs can be deleted' });

    const no = capa.capa_no;
    await CapaTeam.destroy({ where: { capa_id: capa.id } });
    await CapaRootCause.destroy({ where: { capa_id: capa.id } });
    await CapaFishbone.destroy({ where: { capa_id: capa.id } });
    await CapaAction.destroy({ where: { capa_id: capa.id } });
    await CapaEffectiveness.destroy({ where: { capa_id: capa.id } });
    await capa.destroy();

    res.json({ success: true, message: `CAPA ${no} deleted` });
  } catch (err) {
    console.error('[capa.delete]', err);
    res.status(500).json({ success: false, message: 'Failed to delete CAPA' });
  }
};
