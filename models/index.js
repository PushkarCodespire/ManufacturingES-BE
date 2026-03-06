const sequelize    = require('../config/database');
const Department   = require('../modules/user/model/Department');
const Role         = require('../modules/user/model/Role');
const User         = require('../modules/user/model/User');
const LoginAttempt = require('../modules/auth/model/LoginAttempt');
const Session      = require('../modules/auth/model/Session');
const AuditLog     = require('../modules/audit/model/AuditLog');
const Notification = require('../modules/notification/model/Notification');
const Site         = require('../modules/masters/model/Site');
const Warehouse    = require('../modules/masters/model/Warehouse');
const Shift        = require('../modules/masters/model/Shift');

// ─── Associations ────────────────────────────────────────────────────────────

// Department → Role
Department.hasMany(Role, { foreignKey: 'department_id', onDelete: 'RESTRICT' });
Role.belongsTo(Department, { foreignKey: 'department_id' });

// Department → User
Department.hasMany(User, { foreignKey: 'department_id', onDelete: 'RESTRICT' });
User.belongsTo(Department, { foreignKey: 'department_id' });

// Role → User
Role.hasMany(User, { foreignKey: 'role_id', onDelete: 'RESTRICT' });
User.belongsTo(Role, { foreignKey: 'role_id' });

// User → AuditLog (nullable user_id — failed logins may not resolve a user)
User.hasMany(AuditLog, { foreignKey: 'user_id', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

// User → Session (SYS-004 refresh tokens)
User.hasMany(Session, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Session.belongsTo(User, { foreignKey: 'user_id' });

// User → Notification (SYS-007)
User.hasMany(Notification, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// Site → Warehouse (one site has many warehouses)
Site.hasMany(Warehouse, { foreignKey: 'site_id', onDelete: 'SET NULL' });
Warehouse.belongsTo(Site, { foreignKey: 'site_id' });

// Site audit — created_by / updated_by
Site.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Site.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Shift audit — created_by / updated_by
Shift.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Shift.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// User ↔ Site  (many-to-many via user_sites junction table)
User.belongsToMany(Site,      { through: 'user_sites',      foreignKey: 'user_id',      otherKey: 'site_id' });
Site.belongsToMany(User,      { through: 'user_sites',      foreignKey: 'site_id',      otherKey: 'user_id' });

// User ↔ Warehouse  (many-to-many via user_warehouses junction table)
User.belongsToMany(Warehouse, { through: 'user_warehouses', foreignKey: 'user_id',      otherKey: 'warehouse_id' });
Warehouse.belongsToMany(User, { through: 'user_warehouses', foreignKey: 'warehouse_id', otherKey: 'user_id' });

module.exports = {
  sequelize,
  Department,
  Role,
  User,
  LoginAttempt,
  Session,
  AuditLog,
  Notification,
  Site,
  Warehouse,
  Shift,
};
