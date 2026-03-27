'use strict';
const { Op } = require('sequelize');
const { LotoProcedure, LotoExecution, LotoPermit, Equipment, User, MaintenanceWorkOrder, PmWorkOrder } = require('../../../models');
const { generateAutoNumber } = require('../../../utils/autoNumber');

const genPermitNumber = () => generateAutoNumber(LotoPermit, 'permit_number', 'LP', { orderBy: 'id' });

exports.getProcedures = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.equipment_id) where.equipment_id = req.query.equipment_id;
    const rows = await LotoProcedure.findAll({
      where,
      include: [{ model: Equipment, as: 'Equipment', attributes: ['id','equipment_code','name'] }],
      order: [['procedure_name','ASC']],
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createProcedure = async (req, res) => {
  try {
    const proc = await LotoProcedure.create({ ...req.body, created_by: req.user?.id });
    res.status(201).json({ data: proc });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.updateProcedure = async (req, res) => {
  try {
    const proc = await LotoProcedure.findByPk(req.params.id);
    if (!proc) return res.status(404).json({ message: 'Not found' });
    await proc.update({ ...req.body, updated_by: req.user?.id });
    res.json({ data: proc });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.getExecutions = async (req, res) => {
  try {
    const where = {};
    if (req.query.equipment_id) where.equipment_id = req.query.equipment_id;
    if (req.query.status) where.status = req.query.status;
    const rows = await LotoExecution.findAll({
      where,
      include: [
        { model: Equipment,    as: 'Equipment',  attributes: ['id','equipment_code','name'] },
        { model: LotoProcedure,as: 'Procedure',  attributes: ['id','procedure_name','hazard_type'] },
        { model: User,         as: 'InitiatedBy',attributes: ['id','name'] },
        { model: LotoPermit,   as: 'Permits' },
      ],
      order: [['initiated_at','DESC']],
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.initiateLoto = async (req, res) => {
  try {
    const exec = await LotoExecution.create({
      ...req.body, status: 'initiated', initiated_by: req.user?.id, initiated_at: new Date(),
    });
    if (req.body.work_order_id) {
      await MaintenanceWorkOrder.update({ loto_completed: false }, { where: { id: req.body.work_order_id } });
    }
    res.status(201).json({ data: exec });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.lockLoto = async (req, res) => {
  try {
    const exec = await LotoExecution.findByPk(req.params.id);
    if (!exec) return res.status(404).json({ message: 'Not found' });
    await exec.update({ status: 'locked', locked_by: req.user?.id, locked_at: new Date(), lock_tag_number: req.body.lock_tag_number });
    res.json({ data: exec });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.completeLoto = async (req, res) => {
  try {
    const exec = await LotoExecution.findByPk(req.params.id);
    if (!exec) return res.status(404).json({ message: 'Not found' });
    await exec.update({ status: 'completed', completed_by: req.user?.id, completed_at: new Date(), notes: req.body.notes });
    if (exec.work_order_id) {
      await MaintenanceWorkOrder.update({ loto_completed: true }, { where: { id: exec.work_order_id } });
    }
    res.json({ data: exec, message: 'LOTO completed — equipment may now be worked on' });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.getPermits = async (req, res) => {
  try {
    const rows = await LotoPermit.findAll({
      include: [
        { model: LotoExecution, as: 'Execution', include: [{ model: Equipment, as: 'Equipment', attributes: ['id','equipment_code','name'] }] },
        { model: User, as: 'IssuedTo',     attributes: ['id','name'] },
        { model: User, as: 'AuthorizedBy', attributes: ['id','name'] },
      ],
      order: [['created_at','DESC']],
      limit: 100,
    });
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

exports.createPermit = async (req, res) => {
  try {
    const permit_number = await genPermitNumber();
    const permit = await LotoPermit.create({ ...req.body, permit_number, created_by: req.user?.id });
    res.status(201).json({ data: permit });
  } catch (e) { res.status(400).json({ message: e.message }); }
};