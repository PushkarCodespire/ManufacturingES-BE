const { Op }        = require('sequelize');
const { User, Role, Department, Site, Warehouse } = require('../../../models');
const { hashPassword }           = require('../../auth/cred/auth.cred');
const { validateUserId, validateAdminReset, validateCreateUser, validateUpdateUser } = require('../cred/user.cred');

// ─── GET /users — List all users (plant_head, it_admin only) ─────────────────
const getAllUsers = async (req, res) => {
  try {
    const { department_id, is_active, search, roles } = req.query;

    const where = {};
    if (department_id)               where.department_id = department_id;
    if (is_active !== undefined)     where.is_active     = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { name:        { [Op.iLike]: `%${search}%` } },
        { employee_id: { [Op.iLike]: `%${search}%` } },
        { email:       { [Op.iLike]: `%${search}%` } },
      ];
    }

    // BUG-012: Optional role filter — comma-separated role names
    // e.g. ?roles=quality_manager,quality_incharge
    const roleInclude = { model: Role, attributes: ['id', 'name', 'label'] };
    if (roles) {
      const roleNames = roles.split(',').map((r) => r.trim()).filter(Boolean);
      if (roleNames.length) {
        roleInclude.where = { name: { [Op.in]: roleNames } };
      }
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password_hash'] },
      include: [
        roleInclude,
        { model: Department, attributes: ['id', 'code', 'name'] },
        { model: Site,       attributes: ['id', 'name', 'code'], through: { attributes: [] } },
        { model: Warehouse,  attributes: ['id', 'name', 'code'], through: { attributes: [] } },
      ],
      order: [['department_id', 'ASC'], ['name', 'ASC']],
    });

    return res.json({ success: true, data: users });
  } catch (err) {
    console.error('[getAllUsers]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /users/:id — Get user by ID ─────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const { error } = validateUserId({ id: req.params.id });
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role,       attributes: ['id', 'name', 'label'] },
        { model: Department, attributes: ['id', 'code', 'name'] },
        { model: Site,       attributes: ['id', 'name', 'code'], through: { attributes: [] } },
        { model: Warehouse,  attributes: ['id', 'name', 'code'], through: { attributes: [] } },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: user });
  } catch (err) {
    console.error('[getUserById]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /users — Create new employee ───────────────────────────────────────
const createUser = async (req, res) => {
  try {
    const { error, value } = validateCreateUser(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(', '),
      });
    }

    // Verify department exists
    const department = await Department.findByPk(value.department_id);
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }

    // Verify role exists and belongs to selected department
    const role = await Role.findOne({
      where: { id: value.role_id, department_id: value.department_id },
    });
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role not found for the selected department',
      });
    }

    // Check email uniqueness
    const emailExists = await User.findOne({ where: { email: value.email } });
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email address is already in use' });
    }

    // Auto-generate employee_id: DT{dept_code}{seq:3}  e.g. DT11005
    const prefix   = `DT${department.code}`;
    const lastUser = await User.findOne({
      where:      { employee_id: { [Op.like]: `${prefix}%` } },
      order:      [['employee_id', 'DESC']],
      attributes: ['employee_id'],
    });

    let seq = 1;
    if (lastUser) {
      const lastSeq = parseInt(lastUser.employee_id.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const employee_id = `${prefix}${String(seq).padStart(3, '0')}`;

    // Hash default password — employee must change on first login (SYS-002)
    const DEFAULT_PASSWORD = 'Dynatech@123';
    const password_hash    = await hashPassword(DEFAULT_PASSWORD);

    const user = await User.create({
      employee_id,
      name:          value.name,
      email:         value.email,
      phone:         value.phone || null,
      department_id: value.department_id,
      role_id:       value.role_id,
      landing_page:  value.landing_page || 'dashboard',
      password_hash,
      is_first_login: true,
      is_active:      true,
    });

    // Assign sites & warehouses (many-to-many via junction tables)
    if (value.site_ids?.length)      await user.setSites(value.site_ids);
    if (value.warehouse_ids?.length) await user.setWarehouses(value.warehouse_ids);

    // Re-fetch with full associations (exclude password)
    const created = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role,       attributes: ['id', 'name', 'label'] },
        { model: Department, attributes: ['id', 'code', 'name'] },
        { model: Site,       attributes: ['id', 'name', 'code'], through: { attributes: [] } },
        { model: Warehouse,  attributes: ['id', 'name', 'code'], through: { attributes: [] } },
      ],
    });

    return res.status(201).json({
      success:       true,
      message:       `Employee ${created.name} created successfully`,
      data:          created,
      temp_password: DEFAULT_PASSWORD,  // shown once to admin in UI
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Employee ID or email already exists' });
    }
    console.error('[createUser]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /users/departments — All departments ─────────────────────────────────
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({ order: [['code', 'ASC']] });
    return res.json({ success: true, data: departments });
  } catch (err) {
    console.error('[getDepartments]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /users/roles?department_id=X — Roles (optionally filtered) ──────────
const getRoles = async (req, res) => {
  try {
    const where = {};
    if (req.query.department_id) where.department_id = req.query.department_id;

    const roles = await Role.findAll({
      where,
      include: [{ model: Department, attributes: ['id', 'code', 'name'] }],
      order:   [['department_id', 'ASC'], ['label', 'ASC']],
    });
    return res.json({ success: true, data: roles });
  } catch (err) {
    console.error('[getRoles]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /users/sites — All active sites ─────────────────────────────────────
const getSites = async (req, res) => {
  try {
    const sites = await Site.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']],
    });
    return res.json({ success: true, data: sites });
  } catch (err) {
    console.error('[getSites]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /users/warehouses?site_id=X — Warehouses (optionally by site) ───────
const getWarehouses = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.site_id) where.site_id = req.query.site_id;

    const warehouses = await Warehouse.findAll({
      where,
      include: [{ model: Site, attributes: ['id', 'name', 'code'] }],
      order:   [['name', 'ASC']],
    });
    return res.json({ success: true, data: warehouses });
  } catch (err) {
    console.error('[getWarehouses]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /users/:id — Update employee ──────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { error: idError } = validateUserId({ id: req.params.id });
    if (idError) {
      return res.status(400).json({ success: false, message: idError.details[0].message });
    }

    const { error, value } = validateUpdateUser(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(', '),
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If email changed, check uniqueness
    if (value.email && value.email !== user.email) {
      const emailExists = await User.findOne({ where: { email: value.email } });
      if (emailExists) {
        return res.status(409).json({ success: false, message: 'Email address is already in use' });
      }
    }

    // If department changed, verify the role belongs to the new department
    if (value.department_id && value.role_id) {
      const role = await Role.findOne({
        where: { id: value.role_id, department_id: value.department_id },
      });
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Role not found for the selected department',
        });
      }
    }

    // Update scalar fields (exclude junction table fields)
    const { site_ids, warehouse_ids, ...scalarFields } = value;

    // When permissions are changed, invalidate existing tokens so the affected
    // user is forced to re-authenticate and pick up the new permission set.
    if ('permissions' in scalarFields) {
      scalarFields.token_invalidated_at = new Date();
    }

    await user.update(scalarFields);

    // Update many-to-many associations
    if (site_ids !== undefined)      await user.setSites(site_ids ?? []);
    if (warehouse_ids !== undefined) await user.setWarehouses(warehouse_ids ?? []);

    // Re-fetch with full associations
    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role,       attributes: ['id', 'name', 'label'] },
        { model: Department, attributes: ['id', 'code', 'name'] },
        { model: Site,       attributes: ['id', 'name', 'code'], through: { attributes: [] } },
        { model: Warehouse,  attributes: ['id', 'name', 'code'], through: { attributes: [] } },
      ],
    });

    return res.json({ success: true, message: 'Employee updated successfully', data: updated });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    console.error('[updateUser]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── SYS-003: Admin reset password (force next login to change) ──────────────
const adminResetPassword = async (req, res) => {
  try {
    const { error, value } = validateAdminReset(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const user = await User.findOne({ where: { employee_id: value.employee_id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Reset to default password and force first-login flow
    const hash = await hashPassword('Dynatech@123');
    await user.update({ password_hash: hash, is_first_login: true });

    return res.json({
      success: true,
      message: `Password reset for ${user.name}. Temporary password: Dynatech@123`,
    });
  } catch (err) {
    console.error('[adminResetPassword]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PATCH /users/:id/toggle — Activate / deactivate user ───────────────────
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ is_active: !user.is_active });

    return res.json({
      success: true,
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
      data:    { is_active: user.is_active },
    });
  } catch (err) {
    console.error('[toggleUserStatus]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  getDepartments,
  getRoles,
  getSites,
  getWarehouses,
  adminResetPassword,
  toggleUserStatus,
};
