'use strict';
const { Op } = require('sequelize');
const { OperatorSkill, OperatorSkillMatrix, User } = require('../../../models');

// ── Auto-number for skills ────────────────────────────────────────────────────
async function nextSkillCode() {
  const last = await OperatorSkill.findOne({ order: [['id', 'DESC']] });
  const seq  = last ? last.id + 1 : 1;
  return `SK-${String(seq).padStart(3, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  OPERATOR SKILLS (definitions)
// ─────────────────────────────────────────────────────────────────────────────

exports.getAllSkills = async (req, res) => {
  try {
    const { search, category, is_active } = req.query;
    const where = {};
    if (search)    where[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }, { code: { [Op.iLike]: `%${search}%` } }];
    if (category)  where.category = category;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const records = await OperatorSkill.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[OperatorSkill.getAll]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSkillById = async (req, res) => {
  try {
    const record = await OperatorSkill.findByPk(req.params.id, {
      include: [{
        model:   OperatorSkillMatrix,
        as:      'Matrices',
        include: [{ model: User, as: 'Operator', attributes: ['id', 'name', 'employee_id'] }],
      }],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Skill not found' });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[OperatorSkill.getById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createSkill = async (req, res) => {
  try {
    const { name, category, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const code   = await nextSkillCode();
    const record = await OperatorSkill.create({
      code, name, category: category || null, description: description || null,
      created_by: req.user?.id,
    });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('[OperatorSkill.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateSkill = async (req, res) => {
  try {
    const record = await OperatorSkill.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Skill not found' });
    const { name, category, description, is_active } = req.body;
    await record.update({
      name:        name        ?? record.name,
      category:    category    ?? record.category,
      description: description ?? record.description,
      is_active:   is_active   !== undefined ? is_active : record.is_active,
      updated_by:  req.user?.id,
    });
    return res.json({ success: true, data: record });
  } catch (err) {
    console.error('[OperatorSkill.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    const record = await OperatorSkill.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Skill not found' });
    const usedCount = await OperatorSkillMatrix.count({ where: { skill_id: req.params.id } });
    if (usedCount > 0) return res.status(400).json({ success: false, message: 'Skill is assigned to operators. Deactivate instead.' });
    await record.destroy();
    return res.json({ success: true, message: 'Skill deleted' });
  } catch (err) {
    console.error('[OperatorSkill.delete]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  SKILL MATRIX (operator ↔ skill mappings)
// ─────────────────────────────────────────────────────────────────────────────

const MATRIX_INCLUDES = [
  { model: User,          as: 'Operator',     attributes: ['id', 'name', 'employee_id'] },
  { model: OperatorSkill, as: 'Skill',        attributes: ['id', 'code', 'name', 'category'] },
  { model: User,          as: 'CertifiedBy',  attributes: ['id', 'name'], required: false },
];

// GET /operator-skills/matrix — full matrix (all operators × skills)
exports.getMatrix = async (req, res) => {
  try {
    const { user_id, skill_id, proficiency, expiring_in_days } = req.query;
    const where = {};
    if (user_id)     where.user_id     = user_id;
    if (skill_id)    where.skill_id    = skill_id;
    if (proficiency) where.proficiency = proficiency;
    if (expiring_in_days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + parseInt(expiring_in_days, 10));
      where.expiry_date = { [Op.lte]: cutoff, [Op.gte]: new Date() };
    }

    const records = await OperatorSkillMatrix.findAll({
      where,
      include: MATRIX_INCLUDES,
      order: [['Operator', 'name', 'ASC'], ['Skill', 'name', 'ASC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[SkillMatrix.getMatrix]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /operator-skills/matrix — assign skill to operator
exports.assignSkill = async (req, res) => {
  try {
    const { user_id, skill_id, proficiency, certified_date, expiry_date, certified_by, notes } = req.body;
    if (!user_id)  return res.status(400).json({ success: false, message: 'user_id is required' });
    if (!skill_id) return res.status(400).json({ success: false, message: 'skill_id is required' });

    const [record, created] = await OperatorSkillMatrix.findOrCreate({
      where: { user_id, skill_id },
      defaults: {
        proficiency:    proficiency    || 'trainee',
        certified_date: certified_date || null,
        expiry_date:    expiry_date    || null,
        certified_by:   certified_by   || null,
        notes:          notes          || null,
        created_by:     req.user?.id,
      },
    });

    if (!created) {
      // Update existing entry
      await record.update({
        proficiency:    proficiency    ?? record.proficiency,
        certified_date: certified_date ?? record.certified_date,
        expiry_date:    expiry_date    ?? record.expiry_date,
        certified_by:   certified_by   ?? record.certified_by,
        notes:          notes          ?? record.notes,
        updated_by:     req.user?.id,
      });
    }

    const full = await OperatorSkillMatrix.findByPk(record.id, { include: MATRIX_INCLUDES });
    return res.status(created ? 201 : 200).json({ success: true, data: full });
  } catch (err) {
    console.error('[SkillMatrix.assign]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /operator-skills/matrix/:id
exports.updateMatrix = async (req, res) => {
  try {
    const record = await OperatorSkillMatrix.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Matrix entry not found' });
    const { proficiency, certified_date, expiry_date, certified_by, notes } = req.body;
    await record.update({
      proficiency:    proficiency    ?? record.proficiency,
      certified_date: certified_date ?? record.certified_date,
      expiry_date:    expiry_date    ?? record.expiry_date,
      certified_by:   certified_by   ?? record.certified_by,
      notes:          notes          ?? record.notes,
      updated_by:     req.user?.id,
    });
    const full = await OperatorSkillMatrix.findByPk(record.id, { include: MATRIX_INCLUDES });
    return res.json({ success: true, data: full });
  } catch (err) {
    console.error('[SkillMatrix.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /operator-skills/matrix/:id
exports.removeMatrix = async (req, res) => {
  try {
    const record = await OperatorSkillMatrix.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Matrix entry not found' });
    await record.destroy();
    return res.json({ success: true, message: 'Skill assignment removed' });
  } catch (err) {
    console.error('[SkillMatrix.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /operator-skills/matrix/by-operator/:userId — all skills for one operator
exports.getByOperator = async (req, res) => {
  try {
    const records = await OperatorSkillMatrix.findAll({
      where:   { user_id: req.params.userId },
      include: MATRIX_INCLUDES,
      order:   [['Skill', 'category', 'ASC'], ['Skill', 'name', 'ASC']],
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('[SkillMatrix.byOperator]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
