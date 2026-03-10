const { RoleRequirement, TrainingTopic, Role } = require('../../../models');
const sequelize = require('../../../config/database');

// ─── GET /hr/role-requirements ────────────────────────────────────────────────
const getAllRequirements = async (req, res) => {
  try {
    const reqs = await RoleRequirement.findAll({
      include: [
        { model: Role,          as: 'Role',  attributes: ['id', 'name', 'label'] },
        { model: TrainingTopic, as: 'Topic', attributes: ['id', 'name', 'category', 'validity_months'] },
      ],
      order: [['role_id', 'ASC'], ['topic_id', 'ASC']],
    });
    return res.json({ success: true, data: reqs });
  } catch (err) {
    console.error('[getAllRequirements]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /hr/role-requirements/role/:roleId ───────────────────────────────────
const getByRole = async (req, res) => {
  try {
    const reqs = await RoleRequirement.findAll({
      where: { role_id: req.params.roleId },
      include: [
        { model: TrainingTopic, as: 'Topic', attributes: ['id', 'name', 'category', 'validity_months'] },
      ],
    });
    return res.json({ success: true, data: reqs });
  } catch (err) {
    console.error('[getByRole]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /hr/role-requirements/bulk ─────────────────────────────────────────
// Body: { role_id: number, topic_ids: number[] }
const bulkSaveForRole = async (req, res) => {
  const { role_id, topic_ids } = req.body;

  if (!role_id) {
    return res.status(400).json({ success: false, message: 'role_id is required' });
  }
  if (!Array.isArray(topic_ids)) {
    return res.status(400).json({ success: false, message: 'topic_ids must be an array' });
  }

  const t = await sequelize.transaction();
  try {
    // Delete all existing requirements for this role
    await RoleRequirement.destroy({ where: { role_id }, transaction: t });

    // Insert the new set
    if (topic_ids.length > 0) {
      const rows = topic_ids.map((topic_id) => ({ role_id, topic_id }));
      await RoleRequirement.bulkCreate(rows, { transaction: t });
    }

    await t.commit();
    return res.json({ success: true, message: 'Requirements saved', data: { role_id, count: topic_ids.length } });
  } catch (err) {
    await t.rollback();
    console.error('[bulkSaveForRole]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /hr/role-requirements/:id ────────────────────────────────────────
const deleteRequirement = async (req, res) => {
  try {
    const req_ = await RoleRequirement.findByPk(req.params.id);
    if (!req_) return res.status(404).json({ success: false, message: 'Requirement not found' });
    await req_.destroy();
    return res.json({ success: true, message: 'Requirement deleted' });
  } catch (err) {
    console.error('[deleteRequirement]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllRequirements, getByRole, bulkSaveForRole, deleteRequirement };
