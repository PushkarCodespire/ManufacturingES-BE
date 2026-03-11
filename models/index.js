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
const Bom                  = require('../modules/masters/model/Bom');
const BomLine              = require('../modules/masters/model/BomLine');
const CycleTimeRule        = require('../modules/masters/model/CycleTimeRule');
const DailyTarget          = require('../modules/masters/model/DailyTarget');
const DowntimeReason       = require('../modules/masters/model/DowntimeReason');
const Package              = require('../modules/masters/model/Package');
const CtqIssue             = require('../modules/masters/model/CtqIssue');
const Tool                 = require('../modules/masters/model/Tool');
const Report               = require('../modules/masters/model/Report');
const Rfq                  = require('../modules/orders/model/Rfq');
const RfqItem              = require('../modules/orders/model/RfqItem');
const Quotation            = require('../modules/orders/model/Quotation');
const QuotationItem        = require('../modules/orders/model/QuotationItem');
const CustomerOrder        = require('../modules/orders/model/CustomerOrder');
const OrderItem            = require('../modules/orders/model/OrderItem');
const Grn                  = require('../modules/store/model/Grn');
const GrnItem              = require('../modules/store/model/GrnItem');
const Inventory            = require('../modules/store/model/Inventory');
const InventoryTxn         = require('../modules/store/model/InventoryTxn');
const MaterialRequest      = require('../modules/store/model/MaterialRequest');
const MaterialRequestItem  = require('../modules/store/model/MaterialRequestItem');
const IssueSlip            = require('../modules/store/model/IssueSlip');
const IssueSlipItem        = require('../modules/store/model/IssueSlipItem');
const StockAdjustment      = require('../modules/store/model/StockAdjustment');
const StockAdjustmentItem  = require('../modules/store/model/StockAdjustmentItem');
const WorkOrder              = require('../modules/production/model/WorkOrder');
const JobCard                = require('../modules/production/model/JobCard');
const IqcInspection          = require('../modules/production/model/IqcInspection');
const IqcInspectionResult    = require('../modules/production/model/IqcInspectionResult');
const LqcInspection          = require('../modules/production/model/LqcInspection');
const LqcInspectionResult    = require('../modules/production/model/LqcInspectionResult');
const PqcInspection          = require('../modules/production/model/PqcInspection');
const PqcInspectionResult    = require('../modules/production/model/PqcInspectionResult');
const OqcInspection          = require('../modules/production/model/OqcInspection');
const OqcInspectionResult    = require('../modules/production/model/OqcInspectionResult');
const ProductionSchedule     = require('../modules/production/model/ProductionSchedule');
const ScrapVoucher           = require('../modules/production/model/ScrapVoucher');
const PurchaseOrder          = require('../modules/procurement/model/PurchaseOrder');
const PurchaseOrderItem      = require('../modules/procurement/model/PurchaseOrderItem');
const Scar                   = require('../modules/procurement/model/Scar');
const SubcontractChallan     = require('../modules/subcontracting/model/SubcontractChallan');
const SubcontractChallanItem = require('../modules/subcontracting/model/SubcontractChallanItem');
const TrainingTopic         = require('../modules/masters/model/TrainingTopic');
const RoleRequirement       = require('../modules/masters/model/RoleRequirement');
const TrainingRecord        = require('../modules/masters/model/TrainingRecord');
const TrainingEffectiveness = require('../modules/masters/model/TrainingEffectiveness');
const Transporter           = require('../modules/masters/model/Transporter');
const DispatchOrder         = require('../modules/masters/model/DispatchOrder');
const DispatchOrderItem     = require('../modules/masters/model/DispatchOrderItem');
const DeliveryChallan       = require('../modules/masters/model/DeliveryChallan');
// ── Sprint 4: Quality ─────────────────────────────────────────────────────────
const Capa               = require('../modules/quality/model/Capa')(sequelize);
const CapaTeam           = require('../modules/quality/model/CapaTeam')(sequelize);
const CapaRootCause      = require('../modules/quality/model/CapaRootCause')(sequelize);
const CapaFishbone       = require('../modules/quality/model/CapaFishbone')(sequelize);
const CapaAction         = require('../modules/quality/model/CapaAction')(sequelize);
const CapaEffectiveness  = require('../modules/quality/model/CapaEffectiveness')(sequelize);
const Ncr                = require('../modules/quality/model/Ncr')(sequelize);
const NcrDisposition     = require('../modules/quality/model/NcrDisposition')(sequelize);
const Complaint          = require('../modules/quality/model/Complaint')(sequelize);
// ── Sprint 4: NPD ─────────────────────────────────────────────────────────────
const Drawing              = require('../modules/npd/model/Drawing')(sequelize);
const DrawingVersion       = require('../modules/npd/model/DrawingVersion')(sequelize);
const CheckSheetTemplate   = require('../modules/npd/model/CheckSheetTemplate')(sequelize);
const CheckSheetDimension  = require('../modules/npd/model/CheckSheetDimension')(sequelize);
const Pfmea                = require('../modules/npd/model/Pfmea')(sequelize);
const PfmeaItem            = require('../modules/npd/model/PfmeaItem')(sequelize);
const PfmeaAction          = require('../modules/npd/model/PfmeaAction')(sequelize);

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

// Item → Bom (one BOM per item)
Item.hasOne(Bom, { foreignKey: 'item_id', as: 'Bom' });
Bom.belongsTo(Item, { foreignKey: 'item_id', as: 'Item' });

// Bom → BomLine (one BOM has many lines)
Bom.hasMany(BomLine, { foreignKey: 'bom_id', as: 'Lines', onDelete: 'CASCADE' });
BomLine.belongsTo(Bom, { foreignKey: 'bom_id' });

// BomLine → Item (component item)
BomLine.belongsTo(Item, { foreignKey: 'component_item_id', as: 'Component' });

// Bom audit
Bom.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Bom.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });
Bom.belongsTo(User, { foreignKey: 'finalized_by', as: 'Finalizer' });

// CycleTimeRule audit
CycleTimeRule.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
CycleTimeRule.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// CycleTimeRule → DailyTarget
CycleTimeRule.hasMany(DailyTarget, { foreignKey: 'rule_id', as: 'DailyTargets', onDelete: 'CASCADE' });
DailyTarget.belongsTo(CycleTimeRule, { foreignKey: 'rule_id' });

// DailyTarget audit
DailyTarget.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
DailyTarget.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// DowntimeReason audit
DowntimeReason.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
DowntimeReason.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Package audit
Package.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Package.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });
// CtqIssue audit
CtqIssue.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
CtqIssue.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Tool audit
Tool.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Tool.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// Report audit
Report.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Report.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// ── Orders module ─────────────────────────────────────────────────────────────

// Rfq — customer FK + line items + audit
Rfq.belongsTo(Vendor, { foreignKey: 'customer_id', as: 'Customer' });
Rfq.belongsTo(User,   { foreignKey: 'created_by',  as: 'Creator'  });
Rfq.belongsTo(User,   { foreignKey: 'updated_by',  as: 'Updater'  });
Rfq.hasMany(RfqItem,  { foreignKey: 'rfq_id',      as: 'Items', onDelete: 'CASCADE' });
Vendor.hasMany(Rfq,   { foreignKey: 'customer_id', as: 'Rfqs' });

// RfqItem — rfq + item FKs
RfqItem.belongsTo(Rfq,  { foreignKey: 'rfq_id'  });
RfqItem.belongsTo(Item, { foreignKey: 'item_id', as: 'Item' });

// Quotation — customer + rfq + line items + audit
Quotation.belongsTo(Vendor,    { foreignKey: 'customer_id',  as: 'Customer' });
Quotation.belongsTo(Rfq,       { foreignKey: 'rfq_id',       as: 'Rfq'      });
Quotation.belongsTo(User,      { foreignKey: 'created_by',   as: 'Creator'  });
Quotation.belongsTo(User,      { foreignKey: 'updated_by',   as: 'Updater'  });
Quotation.hasMany(QuotationItem, { foreignKey: 'quotation_id', as: 'Items', onDelete: 'CASCADE' });
Rfq.hasMany(Quotation,         { foreignKey: 'rfq_id',       as: 'Quotations' });
Vendor.hasMany(Quotation,      { foreignKey: 'customer_id',  as: 'Quotations' });

// QuotationItem — quotation + item FKs
QuotationItem.belongsTo(Quotation, { foreignKey: 'quotation_id' });
QuotationItem.belongsTo(Item,      { foreignKey: 'item_id',     as: 'Item' });

// CustomerOrder — customer + quotation + line items + audit
CustomerOrder.belongsTo(Vendor,    { foreignKey: 'customer_id',  as: 'Customer'  });
CustomerOrder.belongsTo(Quotation, { foreignKey: 'quotation_id', as: 'Quotation' });
CustomerOrder.belongsTo(User,      { foreignKey: 'created_by',   as: 'Creator'   });
CustomerOrder.belongsTo(User,      { foreignKey: 'updated_by',   as: 'Updater'   });
CustomerOrder.hasMany(OrderItem,   { foreignKey: 'order_id',     as: 'Items', onDelete: 'CASCADE' });
Quotation.hasMany(CustomerOrder,   { foreignKey: 'quotation_id', as: 'Orders' });
Vendor.hasMany(CustomerOrder,      { foreignKey: 'customer_id',  as: 'Orders' });

// OrderItem — order + item FKs
OrderItem.belongsTo(CustomerOrder, { foreignKey: 'order_id' });
OrderItem.belongsTo(Item,          { foreignKey: 'item_id', as: 'Item' });

// ── Store associations ────────────────────────────────────────────────────────

// Grn — vendor + warehouse + audit + items
Grn.belongsTo(Vendor,    { foreignKey: 'vendor_id',    as: 'Vendor'    });
Grn.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'Warehouse' });
Grn.belongsTo(User,      { foreignKey: 'created_by',   as: 'Creator'   });
Grn.hasMany(GrnItem,     { foreignKey: 'grn_id',        as: 'Items', onDelete: 'CASCADE' });
GrnItem.belongsTo(Grn,   { foreignKey: 'grn_id',        as: 'Grn'       });
GrnItem.belongsTo(Item,  { foreignKey: 'item_id',       as: 'Item'      });

// Inventory + InventoryTxn
Inventory.belongsTo(Item,         { foreignKey: 'item_id',      as: 'Item'      });
Inventory.belongsTo(Warehouse,    { foreignKey: 'warehouse_id', as: 'Warehouse' });
InventoryTxn.belongsTo(Item,      { foreignKey: 'item_id',      as: 'Item'      });
InventoryTxn.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'Warehouse' });

// MaterialRequest — warehouse + user audit + items
MaterialRequest.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'Warehouse' });
MaterialRequest.belongsTo(User,      { foreignKey: 'requested_by', as: 'Requester' });
MaterialRequest.belongsTo(User,      { foreignKey: 'created_by',   as: 'Creator'   });
MaterialRequest.hasMany(MaterialRequestItem, { foreignKey: 'request_id', as: 'Items', onDelete: 'CASCADE' });
MaterialRequestItem.belongsTo(MaterialRequest, { foreignKey: 'request_id', as: 'Request' });
MaterialRequestItem.belongsTo(Item,            { foreignKey: 'item_id',    as: 'Item'    });

// IssueSlip — warehouse + user audit + material request + items
IssueSlip.belongsTo(Warehouse,       { foreignKey: 'warehouse_id',        as: 'Warehouse'       });
IssueSlip.belongsTo(User,            { foreignKey: 'issued_to',           as: 'IssuedTo'        });
IssueSlip.belongsTo(User,            { foreignKey: 'created_by',          as: 'Creator'         });
IssueSlip.belongsTo(MaterialRequest, { foreignKey: 'material_request_id', as: 'MaterialRequest' });
IssueSlip.hasMany(IssueSlipItem,     { foreignKey: 'slip_id',             as: 'Items', onDelete: 'CASCADE' });
IssueSlipItem.belongsTo(IssueSlip,   { foreignKey: 'slip_id',             as: 'Slip' });
IssueSlipItem.belongsTo(Item,        { foreignKey: 'item_id',             as: 'Item' });

// StockAdjustment — warehouse + user audit + items
StockAdjustment.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'Warehouse' });
StockAdjustment.belongsTo(User,      { foreignKey: 'created_by',   as: 'Creator'   });
StockAdjustment.hasMany(StockAdjustmentItem,    { foreignKey: 'adj_id', as: 'Items', onDelete: 'CASCADE' });
StockAdjustmentItem.belongsTo(StockAdjustment,  { foreignKey: 'adj_id',  as: 'Adjustment' });
StockAdjustmentItem.belongsTo(Item,             { foreignKey: 'item_id', as: 'Item'       });

// ── Production module associations ──────────────────────────────────────────
WorkOrder.belongsTo(Item,          { foreignKey: 'item_id',           as: 'Item'          });
WorkOrder.belongsTo(Machine,       { foreignKey: 'machine_id',        as: 'Machine'       });
WorkOrder.belongsTo(Shift,         { foreignKey: 'shift_id',          as: 'Shift'         });
WorkOrder.belongsTo(CustomerOrder, { foreignKey: 'customer_order_id', as: 'CustomerOrder' });
WorkOrder.belongsTo(User,          { foreignKey: 'created_by',        as: 'Creator'       });
WorkOrder.belongsTo(User,          { foreignKey: 'updated_by',        as: 'Updater'       });
WorkOrder.hasMany(JobCard,         { foreignKey: 'work_order_id',     as: 'JobCards'      });

JobCard.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
JobCard.belongsTo(Machine,   { foreignKey: 'machine_id',   as: 'Machine'   });
JobCard.belongsTo(User,      { foreignKey: 'operator_id',  as: 'Operator'  });
JobCard.belongsTo(User,      { foreignKey: 'created_by',   as: 'Creator'   });

IqcInspection.belongsTo(Item,   { foreignKey: 'item_id',      as: 'Item'      });
IqcInspection.belongsTo(Vendor, { foreignKey: 'vendor_id',    as: 'Vendor'    });
IqcInspection.belongsTo(User,   { foreignKey: 'inspector_id', as: 'Inspector' });
IqcInspection.belongsTo(User,   { foreignKey: 'created_by',   as: 'Creator'   });
IqcInspection.belongsTo(Grn,    { foreignKey: 'grn_id',       as: 'Grn'       });
IqcInspection.hasMany(IqcInspectionResult, { foreignKey: 'inspection_id', as: 'Results', onDelete: 'CASCADE' });
IqcInspectionResult.belongsTo(IqcInspection, { foreignKey: 'inspection_id', as: 'Inspection' });

LqcInspection.belongsTo(Item,      { foreignKey: 'item_id',       as: 'Item'      });
LqcInspection.belongsTo(Machine,   { foreignKey: 'machine_id',    as: 'Machine'   });
LqcInspection.belongsTo(User,      { foreignKey: 'inspector_id',  as: 'Inspector' });
LqcInspection.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
LqcInspection.belongsTo(JobCard,   { foreignKey: 'job_card_id',   as: 'JobCard'   });
LqcInspection.hasMany(LqcInspectionResult, { foreignKey: 'inspection_id', as: 'Results', onDelete: 'CASCADE' });
LqcInspectionResult.belongsTo(LqcInspection, { foreignKey: 'inspection_id', as: 'Inspection' });

PqcInspection.belongsTo(Item,      { foreignKey: 'item_id',       as: 'Item'      });
PqcInspection.belongsTo(User,      { foreignKey: 'inspector_id',  as: 'Inspector' });
PqcInspection.belongsTo(User,      { foreignKey: 'created_by',    as: 'Creator'   });
PqcInspection.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
PqcInspection.hasMany(PqcInspectionResult, { foreignKey: 'inspection_id', as: 'Results', onDelete: 'CASCADE' });
PqcInspectionResult.belongsTo(PqcInspection, { foreignKey: 'inspection_id', as: 'Inspection' });

OqcInspection.belongsTo(Item,   { foreignKey: 'item_id',      as: 'Item'      });
OqcInspection.belongsTo(Vendor, { foreignKey: 'customer_id',  as: 'Customer'  });
OqcInspection.belongsTo(User,   { foreignKey: 'inspector_id', as: 'Inspector' });
OqcInspection.belongsTo(User,   { foreignKey: 'created_by',   as: 'Creator'   });
OqcInspection.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
OqcInspection.hasMany(OqcInspectionResult, { foreignKey: 'inspection_id', as: 'Results', onDelete: 'CASCADE' });
OqcInspectionResult.belongsTo(OqcInspection, { foreignKey: 'inspection_id', as: 'Inspection' });

ProductionSchedule.belongsTo(Item,      { foreignKey: 'item_id',       as: 'Item'      });
ProductionSchedule.belongsTo(Machine,   { foreignKey: 'machine_id',    as: 'Machine'   });
ProductionSchedule.belongsTo(Shift,     { foreignKey: 'shift_id',      as: 'Shift'     });
ProductionSchedule.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
ProductionSchedule.belongsTo(User,      { foreignKey: 'created_by',    as: 'Creator'   });

ScrapVoucher.belongsTo(Item,      { foreignKey: 'item_id',       as: 'Item'         });
ScrapVoucher.belongsTo(Machine,   { foreignKey: 'machine_id',    as: 'Machine'      });
ScrapVoucher.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder'    });
ScrapVoucher.belongsTo(User,      { foreignKey: 'authorized_by', as: 'AuthorizedBy' });
ScrapVoucher.belongsTo(User,      { foreignKey: 'created_by',    as: 'Creator'      });

// ── Procurement module associations ─────────────────────────────────────────
PurchaseOrder.belongsTo(Vendor, { foreignKey: 'vendor_id',  as: 'Vendor'  });
PurchaseOrder.belongsTo(User,   { foreignKey: 'created_by', as: 'Creator' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'po_id', as: 'Items', onDelete: 'CASCADE' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'po_id',    as: 'PurchaseOrder' });
PurchaseOrderItem.belongsTo(Item,          { foreignKey: 'item_id',  as: 'Item'          });
Scar.belongsTo(Vendor, { foreignKey: 'vendor_id',  as: 'Vendor'  });
Scar.belongsTo(User,   { foreignKey: 'created_by', as: 'Creator' });

// ── Subcontracting module associations ───────────────────────────────────────
SubcontractChallan.belongsTo(Vendor,    { foreignKey: 'vendor_id',     as: 'Vendor'     });
SubcontractChallan.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder'  });
SubcontractChallan.belongsTo(User,      { foreignKey: 'created_by',    as: 'Creator'    });
SubcontractChallan.hasMany(SubcontractChallanItem, { foreignKey: 'challan_id', as: 'Items', onDelete: 'CASCADE' });
SubcontractChallanItem.belongsTo(SubcontractChallan, { foreignKey: 'challan_id', as: 'Challan' });
SubcontractChallanItem.belongsTo(Item,               { foreignKey: 'item_id',    as: 'Item'    });

// User ↔ Site  (many-to-many via user_sites junction table)
User.belongsToMany(Site,      { through: 'user_sites',      foreignKey: 'user_id',      otherKey: 'site_id' });
Site.belongsToMany(User,      { through: 'user_sites',      foreignKey: 'site_id',      otherKey: 'user_id' });

// User ↔ Warehouse  (many-to-many via user_warehouses junction table)
User.belongsToMany(Warehouse, { through: 'user_warehouses', foreignKey: 'user_id',      otherKey: 'warehouse_id' });
Warehouse.belongsToMany(User, { through: 'user_warehouses', foreignKey: 'warehouse_id', otherKey: 'user_id' });

// ── HR & Training associations ────────────────────────────────────────────────

// TrainingTopic audit
TrainingTopic.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
TrainingTopic.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// RoleRequirement → Role + Topic
RoleRequirement.belongsTo(Role,          { foreignKey: 'role_id',  as: 'Role'  });
RoleRequirement.belongsTo(TrainingTopic, { foreignKey: 'topic_id', as: 'Topic' });
Role.hasMany(RoleRequirement,            { foreignKey: 'role_id',  as: 'TrainingRequirements', onDelete: 'CASCADE' });
TrainingTopic.hasMany(RoleRequirement,   { foreignKey: 'topic_id', as: 'Requirements',         onDelete: 'CASCADE' });

// TrainingRecord → Employee, Topic, Trainer
TrainingRecord.belongsTo(User,          { foreignKey: 'employee_id', as: 'Employee' });
TrainingRecord.belongsTo(TrainingTopic, { foreignKey: 'topic_id',    as: 'Topic'    });
TrainingRecord.belongsTo(User,          { foreignKey: 'trainer_id',  as: 'Trainer'  });
TrainingRecord.belongsTo(User,          { foreignKey: 'created_by',  as: 'Creator'  });
TrainingRecord.belongsTo(User,          { foreignKey: 'updated_by',  as: 'Updater'  });
TrainingRecord.hasMany(TrainingEffectiveness, { foreignKey: 'training_record_id', as: 'Evaluations', onDelete: 'CASCADE' });

// TrainingEffectiveness → TrainingRecord, Evaluator
TrainingEffectiveness.belongsTo(TrainingRecord, { foreignKey: 'training_record_id', as: 'TrainingRecord' });
TrainingEffectiveness.belongsTo(User,           { foreignKey: 'evaluator_id',        as: 'Evaluator'     });
TrainingEffectiveness.belongsTo(User,           { foreignKey: 'created_by',          as: 'Creator'       });
TrainingEffectiveness.belongsTo(User,           { foreignKey: 'updated_by',          as: 'Updater'       });

// ── Dispatch & Logistics associations ─────────────────────────────────────────

// Transporter audit
Transporter.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Transporter.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// DispatchOrder → Customer (Vendor), Transporter, Warehouse
DispatchOrder.belongsTo(Vendor,      { foreignKey: 'customer_id',       as: 'Customer'      });
DispatchOrder.belongsTo(Transporter, { foreignKey: 'transporter_id',    as: 'Transporter'   });
DispatchOrder.belongsTo(Warehouse,   { foreignKey: 'from_warehouse_id', as: 'FromWarehouse' });
DispatchOrder.belongsTo(User,        { foreignKey: 'created_by',        as: 'Creator'       });
DispatchOrder.belongsTo(User,        { foreignKey: 'updated_by',        as: 'Updater'       });
DispatchOrder.hasMany(DispatchOrderItem, { foreignKey: 'dispatch_order_id', as: 'Items',    onDelete: 'CASCADE' });
DispatchOrder.hasMany(DeliveryChallan,   { foreignKey: 'dispatch_order_id', as: 'Challans', onDelete: 'CASCADE' });

// DispatchOrderItem → DispatchOrder, Item
DispatchOrderItem.belongsTo(DispatchOrder, { foreignKey: 'dispatch_order_id', as: 'DispatchOrder' });
DispatchOrderItem.belongsTo(Item,          { foreignKey: 'item_id',           as: 'Item'          });
DispatchOrderItem.belongsTo(User,          { foreignKey: 'created_by',        as: 'Creator'       });
DispatchOrderItem.belongsTo(User,          { foreignKey: 'updated_by',        as: 'Updater'       });

// DeliveryChallan → DispatchOrder
DeliveryChallan.belongsTo(DispatchOrder, { foreignKey: 'dispatch_order_id', as: 'DispatchOrder' });
DeliveryChallan.belongsTo(User,          { foreignKey: 'created_by',        as: 'Creator'       });
DeliveryChallan.belongsTo(User,          { foreignKey: 'updated_by',        as: 'Updater'       });

// Transporter reverse
Transporter.hasMany(DispatchOrder, { foreignKey: 'transporter_id', as: 'Orders', onDelete: 'SET NULL' });

// ── Sprint 4: Quality associations ───────────────────────────────────────────

// Capa — champion + creator + child collections
Capa.belongsTo(User,    { foreignKey: 'champion_id', as: 'Champion' });
Capa.belongsTo(User,    { foreignKey: 'created_by',  as: 'Creator'  });
Capa.hasMany(CapaTeam,          { foreignKey: 'capa_id', as: 'Team',         onDelete: 'CASCADE' });
Capa.hasMany(CapaRootCause,     { foreignKey: 'capa_id', as: 'RootCauses',   onDelete: 'CASCADE' });
Capa.hasMany(CapaFishbone,      { foreignKey: 'capa_id', as: 'Fishbone',     onDelete: 'CASCADE' });
Capa.hasMany(CapaAction,        { foreignKey: 'capa_id', as: 'Actions',      onDelete: 'CASCADE' });
Capa.hasMany(CapaEffectiveness, { foreignKey: 'capa_id', as: 'Effectiveness',onDelete: 'CASCADE' });

CapaTeam.belongsTo(Capa, { foreignKey: 'capa_id' });
CapaTeam.belongsTo(User, { foreignKey: 'user_id', as: 'TeamMember' });

CapaRootCause.belongsTo(Capa, { foreignKey: 'capa_id' });
CapaFishbone.belongsTo(Capa,  { foreignKey: 'capa_id' });
CapaAction.belongsTo(Capa,    { foreignKey: 'capa_id' });
CapaEffectiveness.belongsTo(Capa, { foreignKey: 'capa_id' });
CapaEffectiveness.belongsTo(User, { foreignKey: 'checked_by', as: 'CheckedBy' });

// Ncr — item + raised_by + disposition
Ncr.belongsTo(Item, { foreignKey: 'item_id',    as: 'Item'      });
Ncr.belongsTo(User, { foreignKey: 'raised_by',  as: 'RaisedBy'  });
Ncr.hasOne(NcrDisposition, { foreignKey: 'ncr_id', as: 'Disposition', onDelete: 'CASCADE' });
NcrDisposition.belongsTo(Ncr,  { foreignKey: 'ncr_id' });
NcrDisposition.belongsTo(User, { foreignKey: 'decision_by', as: 'DecisionBy' });

// Complaint — item + creator + capa link
Complaint.belongsTo(Item, { foreignKey: 'item_id',    as: 'Item'    });
Complaint.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Complaint.belongsTo(Capa, { foreignKey: 'capa_id',    as: 'Capa'    });

// ── Sprint 4: NPD associations ────────────────────────────────────────────────

// Drawing — item + creator + approver + versions
Drawing.belongsTo(Item,          { foreignKey: 'item_id',             as: 'Item'     });
Drawing.belongsTo(User,          { foreignKey: 'created_by',          as: 'Creator'  });
Drawing.belongsTo(User,          { foreignKey: 'approved_by',         as: 'Approver' });
Drawing.hasMany(DrawingVersion,  { foreignKey: 'drawing_id',          as: 'Versions', onDelete: 'CASCADE' });
DrawingVersion.belongsTo(Drawing,{ foreignKey: 'drawing_id' });

// CheckSheetTemplate — drawing + item + creator + dimensions
CheckSheetTemplate.belongsTo(Drawing, { foreignKey: 'drawing_id', as: 'Drawing' });
CheckSheetTemplate.belongsTo(Item,    { foreignKey: 'item_id',    as: 'Item'    });
CheckSheetTemplate.belongsTo(User,    { foreignKey: 'created_by', as: 'Creator' });
CheckSheetTemplate.hasMany(CheckSheetDimension, { foreignKey: 'template_id', as: 'Dimensions', onDelete: 'CASCADE' });
CheckSheetDimension.belongsTo(CheckSheetTemplate, { foreignKey: 'template_id' });

// Pfmea — item + drawing + creator + items + actions
Pfmea.belongsTo(Item,    { foreignKey: 'item_id',    as: 'Item'    });
Pfmea.belongsTo(Drawing, { foreignKey: 'drawing_id', as: 'Drawing' });
Pfmea.belongsTo(User,    { foreignKey: 'created_by', as: 'Creator' });
Pfmea.hasMany(PfmeaItem, { foreignKey: 'pfmea_id',   as: 'Items',  onDelete: 'CASCADE' });
PfmeaItem.belongsTo(Pfmea,       { foreignKey: 'pfmea_id' });
PfmeaItem.hasMany(PfmeaAction,   { foreignKey: 'pfmea_item_id', as: 'Actions', onDelete: 'CASCADE' });
PfmeaAction.belongsTo(PfmeaItem, { foreignKey: 'pfmea_item_id' });
PfmeaAction.belongsTo(User,      { foreignKey: 'responsible_id', as: 'Responsible' });

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
  Bom,
  BomLine,
  CycleTimeRule,
  DailyTarget,
  DowntimeReason,
  Package,
  CtqIssue,
  Tool,
  Report,
  Rfq,
  RfqItem,
  Quotation,
  QuotationItem,
  CustomerOrder,
  OrderItem,
  Grn,
  GrnItem,
  Inventory,
  InventoryTxn,
  MaterialRequest,
  MaterialRequestItem,
  IssueSlip,
  IssueSlipItem,
  StockAdjustment,
  StockAdjustmentItem,
  WorkOrder,
  JobCard,
  IqcInspection,
  IqcInspectionResult,
  LqcInspection,
  LqcInspectionResult,
  PqcInspection,
  PqcInspectionResult,
  OqcInspection,
  OqcInspectionResult,
  ProductionSchedule,
  ScrapVoucher,
  PurchaseOrder,
  PurchaseOrderItem,
  Scar,
  SubcontractChallan,
  SubcontractChallanItem,
  TrainingTopic,
  RoleRequirement,
  TrainingRecord,
  TrainingEffectiveness,
  Transporter,
  DispatchOrder,
  DispatchOrderItem,
  DeliveryChallan,
  // Sprint 4: Quality
  Capa,
  CapaTeam,
  CapaRootCause,
  CapaFishbone,
  CapaAction,
  CapaEffectiveness,
  Ncr,
  NcrDisposition,
  Complaint,
  // Sprint 4: NPD
  Drawing,
  DrawingVersion,
  CheckSheetTemplate,
  CheckSheetDimension,
  Pfmea,
  PfmeaItem,
  PfmeaAction,
};
