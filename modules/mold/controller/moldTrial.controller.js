const {
  Mold, MoldTrialProtocol, MoldTrial, MoldTrialParameter,
  MoldTrialReading, MoldTrialPhoto, Machine, User,
} = require('../../../models');
const { createTrial, updateTrial, addParameter } = require('../cred/moldTrial.cred');

// GET /mold/trial/protocols
const getProtocols = async (req, res) => {
  try {
    const protocols = await MoldTrialProtocol.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    return res.json({ success: true, data: protocols });
  } catch (err) {
    console.error('[MoldTrial.getProtocols]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/trial/protocols
const createProtocol = async (req, res) => {
  try {
    const record = await MoldTrialProtocol.create({ ...req.body, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[MoldTrial.createProtocol]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/trial/runs?mold_id=&status=&trial_type=
const getTrials = async (req, res) => {
  try {
    const { mold_id, status, trial_type } = req.query;
    const where = {};
    if (mold_id)    where.mold_id    = mold_id;
    if (status)     where.status     = status;
    if (trial_type) where.trial_type = trial_type;
    const trials = await MoldTrial.findAll({
      where,
      include: [
        { model: Mold,              as: 'Mold',        attributes: ['id', 'mold_code', 'name', 'status'] },
        { model: MoldTrialProtocol, as: 'Protocol',    attributes: ['id', 'name'] },
        { model: Machine,           as: 'Machine',     attributes: ['id', 'name', 'code'] },
        { model: User,              as: 'ConductedBy', attributes: ['id', 'name', 'employee_id'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: trials });
  } catch (err) {
    console.error('[MoldTrial.getTrials]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/trial/runs/:id
const getTrialById = async (req, res) => {
  try {
    const trial = await MoldTrial.findByPk(req.params.id, {
      include: [
        { model: Mold,               as: 'Mold' },
        { model: MoldTrialProtocol,  as: 'Protocol' },
        { model: MoldTrialParameter, as: 'Parameters' },
        { model: MoldTrialReading,   as: 'Readings',   limit: 200, order: [['recorded_at', 'ASC']] },
        { model: MoldTrialPhoto,     as: 'Photos' },
        { model: User,               as: 'ConductedBy', attributes: ['id', 'name'] },
      ],
    });
    if (!trial) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: trial });
  } catch (err) {
    console.error('[MoldTrial.getTrialById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/trial/:moldId/start
const createTrialRun = async (req, res) => {
  try {
    const { moldId } = req.params;
    const { error, value } = createTrial.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const mold = await Mold.findByPk(moldId);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });
    const trial = await MoldTrial.create({
      ...value, mold_id: moldId, status: 'in_progress',
      conducted_by: req.user?.id, created_by: req.user?.id,
    });
    return res.status(201).json({ success: true, data: trial });
  } catch (err) {
    console.error('[MoldTrial.createTrialRun]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /mold/trial/runs/:id
const updateTrialRun = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateTrial.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const trial = await MoldTrial.findByPk(id);
    if (!trial) return res.status(404).json({ success: false, message: 'Not found' });
    await trial.update({ ...value, updated_by: req.user?.id });
    // If passed, update mold status to production_ready
    if (value.overall_result === 'pass' || value.status === 'passed') {
      await Mold.update({ status: 'production_ready' }, { where: { id: trial.mold_id } });
    }
    return res.json({ success: true, data: trial });
  } catch (err) {
    console.error('[MoldTrial.updateTrialRun]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/trial/runs/:id/parameters
const addTrialParameter = async (req, res) => {
  try {
    const { error, value } = addParameter.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const param = await MoldTrialParameter.create({ ...value, trial_id: req.params.id });
    return res.status(201).json({ success: true, data: param });
  } catch (err) {
    console.error('[MoldTrial.addTrialParameter]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProtocols, createProtocol, getTrials, getTrialById, createTrialRun, updateTrialRun, addTrialParameter };
