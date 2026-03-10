const Joi = require('joi');
const { DeliveryChallan, DispatchOrder, Vendor, Transporter, User } = require('../../../models');
const { Op } = require('sequelize');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];

const challanSchema = Joi.object({
  dispatch_order_id: Joi.number().integer().required(),
  issued_date:       Joi.string().isoDate().allow(null).optional(),
  signed_date:       Joi.string().isoDate().allow(null).optional(),
  status:            Joi.string().valid('pending', 'issued', 'signed', 'archived').default('pending'),
  receiver_name:     Joi.string().trim().max(200).allow('', null).optional(),
  receiver_phone:    Joi.string().trim().max(30).allow('', null).optional(),
  delivery_notes:    Joi.string().trim().max(2000).allow('', null).optional(),
});

// Generate unique challan number: DC-YYYYMMDD-XXXX
const generateChallanNumber = async () => {
  const today  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'DC-' + today + '-';
  const last   = await DeliveryChallan.findOne({
    where: { challan_number: { [Op.like]: prefix + '%' } },
    order: [['challan_number', 'DESC']],
  });
  const seq = last ? parseInt(last.challan_number.slice(-4), 10) + 1 : 1;
  return prefix + String(seq).padStart(4, '0');
};

const buildIncludes = () => [
  {
    model: DispatchOrder,
    as: 'DispatchOrder',
    attributes: ['id', 'order_number', 'status', 'dispatch_date', 'vehicle_number', 'driver_name'],
    include: [
      { model: Vendor,      as: 'Customer',    attributes: ['id', 'name'] },
      { model: Transporter, as: 'Transporter', attributes: ['id', 'name'] },
    ],
  },
  { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_ATTRS },
];

const getAllChallans = async (req, res) => {
  try {
    const where = {};
    if (req.query.status)            where.status = req.query.status;
    if (req.query.dispatch_order_id) where.dispatch_order_id = req.query.dispatch_order_id;
    if (req.query.search)            where.challan_number = { [Op.iLike]: '%' + req.query.search + '%' };

    const challans = await DeliveryChallan.findAll({
      where,
      include: buildIncludes(),
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, data: challans });
  } catch (err) {
    console.error('[getAllChallans]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createChallan = async (req, res) => {
  try {
    const { error, value } = challanSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });

    const challan_number = await generateChallanNumber();
    const challan = await DeliveryChallan.create({
      ...value,
      challan_number,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    });
    const full = await DeliveryChallan.findByPk(challan.id, { include: buildIncludes() });
    return res.status(201).json({ success: true, message: 'Challan ' + challan_number + ' created', data: full });
  } catch (err) {
    console.error('[createChallan]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateChallan = async (req, res) => {
  try {
    const challan = await DeliveryChallan.findByPk(req.params.id);
    if (!challan) return res.status(404).json({ success: false, message: 'Delivery challan not found' });

    const updateSchema = challanSchema.fork(['dispatch_order_id'], (s) => s.optional());
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });

    await challan.update({ ...value, updated_by: req.user?.id || null });
    const full = await DeliveryChallan.findByPk(challan.id, { include: buildIncludes() });
    return res.json({ success: true, message: 'Challan updated', data: full });
  } catch (err) {
    console.error('[updateChallan]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteChallan = async (req, res) => {
  try {
    const challan = await DeliveryChallan.findByPk(req.params.id);
    if (!challan) return res.status(404).json({ success: false, message: 'Delivery challan not found' });
    if (challan.status === 'signed') return res.status(409).json({ success: false, message: 'Cannot delete a signed challan' });
    await challan.destroy();
    return res.json({ success: true, message: 'Challan ' + challan.challan_number + ' deleted' });
  } catch (err) {
    console.error('[deleteChallan]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllChallans, createChallan, updateChallan, deleteChallan };
