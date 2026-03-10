const Joi = require('joi');
const { Transporter, User } = require('../../../models');
const { Op } = require('sequelize');

const AUDIT_ATTRS = ['id', 'name', 'employee_id'];
const auditIncludes = [
  { model: User, as: 'Creator', attributes: AUDIT_ATTRS },
  { model: User, as: 'Updater', attributes: AUDIT_ATTRS },
];

const transporterSchema = Joi.object({
  name:           Joi.string().trim().min(2).max(200).required(),
  contact_person: Joi.string().trim().max(200).allow('', null).optional(),
  phone:          Joi.string().trim().max(30).allow('', null).optional(),
  email:          Joi.string().trim().email({ tlds: false }).max(200).allow('', null).optional(),
  gstin:          Joi.string().trim().max(20).allow('', null).optional(),
  address:        Joi.string().trim().max(2000).allow('', null).optional(),
  vehicle_types:  Joi.array().items(Joi.string()).default([]),
  notes:          Joi.string().trim().max(2000).allow('', null).optional(),
  is_active:      Joi.boolean().default(true),
});

const getAllTransporters = async (req, res) => {
  try {
    const where = {};
    if (req.query.search)    where.name      = { [Op.iLike]: '%' + req.query.search + '%' };
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const transporters = await Transporter.findAll({
      where,
      include: auditIncludes,
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: transporters });
  } catch (err) {
    console.error('[getAllTransporters]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createTransporter = async (req, res) => {
  try {
    const { error, value } = transporterSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });

    const transporter = await Transporter.create({ ...value, created_by: req.user?.id || null, updated_by: req.user?.id || null });
    const full = await Transporter.findByPk(transporter.id, { include: auditIncludes });
    return res.status(201).json({ success: true, message: 'Transporter "' + transporter.name + '" created', data: full });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ success: false, message: 'A transporter with this name already exists' });
    console.error('[createTransporter]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateTransporter = async (req, res) => {
  try {
    const transporter = await Transporter.findByPk(req.params.id);
    if (!transporter) return res.status(404).json({ success: false, message: 'Transporter not found' });

    const updateSchema = transporterSchema.fork(['name'], (s) => s.optional());
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.details.map((d) => d.message).join(', ') });

    await transporter.update({ ...value, updated_by: req.user?.id || null });
    const full = await Transporter.findByPk(transporter.id, { include: auditIncludes });
    return res.json({ success: true, message: 'Transporter updated', data: full });
  } catch (err) {
    console.error('[updateTransporter]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteTransporter = async (req, res) => {
  try {
    const transporter = await Transporter.findByPk(req.params.id);
    if (!transporter) return res.status(404).json({ success: false, message: 'Transporter not found' });

    const { DispatchOrder } = require('../../../models');
    const refCount = await DispatchOrder.count({ where: { transporter_id: transporter.id } });
    if (refCount > 0) return res.status(409).json({ success: false, message: 'Cannot delete — ' + refCount + ' dispatch order(s) use this transporter' });

    await transporter.destroy();
    return res.json({ success: true, message: 'Transporter "' + transporter.name + '" deleted' });
  } catch (err) {
    console.error('[deleteTransporter]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllTransporters, createTransporter, updateTransporter, deleteTransporter };
