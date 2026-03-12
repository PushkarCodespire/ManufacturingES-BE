const { Mold, MoldRepairType, MoldRepairRequest, MoldRepairTracking, MoldRepairCost, Vendor, User } = require('../../../models');
const { createRepairRequest, approveRepair, addTrackingEvent, addRepairCost } = require('../cred/moldRepair.cred');

// GET /mold/repair/types
const getRepairTypes = async (req, res) => {
  try {
    const types = await MoldRepairType.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    return res.json({ success: true, data: types });
  } catch (err) {
    console.error('[MoldRepair.getRepairTypes]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/repair/types
const createRepairType = async (req, res) => {
  try {
    const record = await MoldRepairType.create({ ...req.body, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[MoldRepair.createRepairType]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/repair/requests?status=&mold_id=&urgency=
const getRepairRequests = async (req, res) => {
  try {
    const { status, mold_id, urgency } = req.query;
    const where = {};
    if (status)  where.status  = status;
    if (mold_id) where.mold_id = mold_id;
    if (urgency) where.urgency = urgency;
    const requests = await MoldRepairRequest.findAll({
      where,
      include: [
        { model: Mold,           as: 'Mold',        attributes: ['id', 'mold_code', 'name', 'status'] },
        { model: MoldRepairType, as: 'RepairType',   attributes: ['id', 'name'] },
        { model: Vendor,         as: 'Vendor',       attributes: ['id', 'name', 'partner_code'] },
        { model: User,           as: 'RequestedBy',  attributes: ['id', 'name', 'employee_id'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error('[MoldRepair.getRepairRequests]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /mold/repair/requests/:id
const getRepairById = async (req, res) => {
  try {
    const record = await MoldRepairRequest.findByPk(req.params.id, {
      include: [
        { model: Mold,               as: 'Mold',           attributes: ['id', 'mold_code', 'name'] },
        { model: MoldRepairType,     as: 'RepairType' },
        { model: Vendor,             as: 'Vendor' },
        { model: MoldRepairTracking, as: 'TrackingEvents',  order: [['event_date', 'ASC']] },
        { model: MoldRepairCost,     as: 'Costs' },
        { model: User,               as: 'RequestedBy',    attributes: ['id', 'name'] },
        { model: User,               as: 'ApprovedBy',     attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[MoldRepair.getRepairById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/repair/:moldId/request
const createRequest = async (req, res) => {
  try {
    const { moldId } = req.params;
    const { error, value } = createRepairRequest.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const mold = await Mold.findByPk(moldId);
    if (!mold) return res.status(404).json({ success: false, message: 'Mold not found' });
    const record = await MoldRepairRequest.create({
      ...value, mold_id: moldId, requested_by: req.user?.id, created_by: req.user?.id,
    });
    await mold.update({ status: 'repair_needed' });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[MoldRepair.createRequest]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /mold/repair/requests/:id/approve
const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = approveRepair.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const record = await MoldRepairRequest.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });
    await record.update({ ...value, status: 'approved', approved_by: req.user?.id, updated_by: req.user?.id });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[MoldRepair.approveRequest]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/repair/requests/:id/track
const addTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = addTrackingEvent.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const record = await MoldRepairRequest.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });
    const event = await MoldRepairTracking.create({ ...value, repair_request_id: id, performed_by: req.user?.id });
    const statusMap = {
      dispatched:         'sub_contracted',
      received_by_vendor: 'sub_contracted',
      repair_started:     'in_progress',
      repair_completed:   'received',
      returned:           'inspection_pending',
    };
    if (statusMap[value.event_type]) {
      const updates = { status: statusMap[value.event_type] };
      if (value.event_type === 'dispatched')  updates.dispatch_date     = new Date();
      if (value.event_type === 'returned')    updates.actual_return_date= new Date();
      await record.update(updates);
    }
    return res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error('[MoldRepair.addTracking]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /mold/repair/requests/:id/costs
const addCost = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = addRepairCost.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.message });
    const cost = await MoldRepairCost.create({ ...value, repair_request_id: id, created_by: req.user?.id });
    return res.status(201).json({ success: true, data: cost });
  } catch (err) {
    console.error('[MoldRepair.addCost]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /mold/repair/requests/:id/complete
const completeRepair = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await MoldRepairRequest.findByPk(id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });
    await record.update({ status: 'completed', actual_cost: req.body.actual_cost, updated_by: req.user?.id });
    await Mold.update({ status: 'trial_pending' }, { where: { id: record.mold_id } });
    return res.json({ success: true, message: 'Repair completed. Mold status set to trial_pending.' });
  } catch (err) {
    console.error('[MoldRepair.completeRepair]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getRepairTypes, createRepairType,
  getRepairRequests, getRepairById, createRequest, approveRequest,
  addTracking, addCost, completeRepair,
};
