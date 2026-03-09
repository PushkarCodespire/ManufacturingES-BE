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
const Machine              = require('../modules/masters/model/Machine');
const Item                 = require('../modules/masters/model/Item');
const ProductionParameter  = require('../modules/masters/model/ProductionParameter');
const MachineParameter     = require('../modules/masters/model/MachineParameter');
const Tag                  = require('../modules/masters/model/Tag');
const Vendor               = require('../modules/masters/model/Vendor');
const VendorCosting        = require('../modules/masters/model/VendorCosting');
const CustomFieldGroup     = require('../modules/masters/model/CustomFieldGroup');
const Integration          = require('../modules/masters/model/Integration');
const IntegrationLog       = require('../modules/masters/model/IntegrationLog');
const StickerTemplate      = require('../modules/masters/model/StickerTemplate');
const Template             = require('../modules/masters/model/Template');
const ProductionForm       = require('../modules/masters/model/ProductionForm');

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

// Warehouse audit — created_by / updated_by
Warehouse.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Warehouse.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Machine — self-referencing parent
Machine.belongsTo(Machine, { foreignKey: 'parent_id', as: 'Parent' });
Machine.hasMany(Machine,   { foreignKey: 'parent_id', as: 'Children' });

// Machine audit — created_by / updated_by
Machine.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Machine.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Item audit — created_by / updated_by
Item.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Item.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// ProductionParameter audit
ProductionParameter.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
ProductionParameter.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Vendor audit + customer-specific FK
Vendor.belongsTo(User, { foreignKey: 'created_by',       as: 'Creator'      });
Vendor.belongsTo(User, { foreignKey: 'updated_by',       as: 'Updater'      });
Vendor.belongsTo(User, { foreignKey: 'sales_manager_id', as: 'SalesManager' });

// VendorCosting — vendor + item + pricing direction
VendorCosting.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'Vendor' });
VendorCosting.belongsTo(Item,   { foreignKey: 'item_id',   as: 'Item'   });
VendorCosting.belongsTo(User,   { foreignKey: 'created_by', as: 'Creator' });
VendorCosting.belongsTo(User,   { foreignKey: 'updated_by', as: 'Updater' });
Vendor.hasMany(VendorCosting, { foreignKey: 'vendor_id', as: 'Costings' });
Item.hasMany(VendorCosting,   { foreignKey: 'item_id',   as: 'Costings' });

// CustomFieldGroup audit — no FK to other domain tables, just audit
CustomFieldGroup.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
CustomFieldGroup.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Integration audit
Integration.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Integration.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// IntegrationLog — belongs to Integration + User
IntegrationLog.belongsTo(Integration, { foreignKey: 'integration_id', as: 'Integration' });
IntegrationLog.belongsTo(User,        { foreignKey: 'created_by',      as: 'Creator'     });
Integration.hasMany(IntegrationLog,   { foreignKey: 'integration_id',  as: 'Logs'        });

// StickerTemplate audit + machine FK
StickerTemplate.belongsTo(User,    { foreignKey: 'created_by',  as: 'Creator' });
StickerTemplate.belongsTo(User,    { foreignKey: 'updated_by',  as: 'Updater' });
StickerTemplate.belongsTo(Machine, { foreignKey: 'machine_id',  as: 'Machine' });

// Template audit
Template.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Template.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// ProductionForm audit
ProductionForm.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
ProductionForm.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Machine ↔ ProductionParameter (many-to-many via machine_parameters)
Machine.belongsToMany(ProductionParameter, {
  through: MachineParameter, foreignKey: 'machine_id', otherKey: 'parameter_id', as: 'Parameters',
});
ProductionParameter.belongsToMany(Machine, {
  through: MachineParameter, foreignKey: 'parameter_id', otherKey: 'machine_id', as: 'Machines',
});
MachineParameter.belongsTo(Machine,             { foreignKey: 'machine_id' });
MachineParameter.belongsTo(ProductionParameter,  { foreignKey: 'parameter_id' });

// Tag audit — created_by / updated_by
Tag.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Tag.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

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
  Machine,
  Item,
  ProductionParameter,
  MachineParameter,
  Tag,
  Vendor,
  VendorCosting,
  CustomFieldGroup,
  Integration,
  IntegrationLog,
  StickerTemplate,
  Template,
  ProductionForm,
};
