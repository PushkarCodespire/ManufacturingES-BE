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
const ItemQualityParam     = require('../modules/masters/model/ItemQualityParam');
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
const Instrument         = require('../modules/quality/model/Instrument')(sequelize);
const CalibrationRecord  = require('../modules/quality/model/CalibrationRecord')(sequelize);
// ── Sprint 4: NPD ─────────────────────────────────────────────────────────────
const Drawing              = require('../modules/npd/model/Drawing')(sequelize);
const DrawingVersion       = require('../modules/npd/model/DrawingVersion')(sequelize);
const CheckSheetTemplate   = require('../modules/npd/model/CheckSheetTemplate')(sequelize);
const CheckSheetDimension  = require('../modules/npd/model/CheckSheetDimension')(sequelize);
const Pfmea                = require('../modules/npd/model/Pfmea')(sequelize);
const PfmeaItem            = require('../modules/npd/model/PfmeaItem')(sequelize);
const PfmeaAction          = require('../modules/npd/model/PfmeaAction')(sequelize);
// ── Sprint 4b: Admin Control Room ────────────────────────────────────────────
const ModuleSetting    = require('../modules/admin/model/ModuleSetting')(sequelize);
const FeatureSetting   = require('../modules/admin/model/FeatureSetting')(sequelize);
const FieldVisibility  = require('../modules/admin/model/FieldVisibility')(sequelize);
const AiAgentSetting   = require('../modules/admin/model/AiAgentSetting')(sequelize);
const AdminAuditLog    = require('../modules/admin/model/AdminAuditLog')(sequelize);
// ── Sprint 4b: Madad Chat ────────────────────────────────────────────────────
const MadadChat        = require('../modules/ai/model/MadadChat')(sequelize);
// ── Mold Management Module ───────────────────────────────────────────────────
const MoldCategory          = require('../modules/mold/model/MoldCategory')(sequelize);
const MoldStorageLocation   = require('../modules/mold/model/MoldStorageLocation')(sequelize);
const Mold                  = require('../modules/mold/model/Mold')(sequelize);
const MoldPartMapping       = require('../modules/mold/model/MoldPartMapping')(sequelize);
const MoldMachineCompat     = require('../modules/mold/model/MoldMachineCompat')(sequelize);
const MoldDocument          = require('../modules/mold/model/MoldDocument')(sequelize);
const MoldQrRegistry        = require('../modules/mold/model/MoldQrRegistry')(sequelize);
const MoldCavity            = require('../modules/mold/model/MoldCavity')(sequelize);
const CavityHistory         = require('../modules/mold/model/CavityHistory')(sequelize);
const MoldShotLog           = require('../modules/mold/model/MoldShotLog')(sequelize);
const MoldShotSummary       = require('../modules/mold/model/MoldShotSummary')(sequelize);
const MoldLifeConfig        = require('../modules/mold/model/MoldLifeConfig')(sequelize);
const MoldLifeAlert         = require('../modules/mold/model/MoldLifeAlert')(sequelize);
const MoldLifeExtension     = require('../modules/mold/model/MoldLifeExtension')(sequelize);
const MoldIssueReturn       = require('../modules/mold/model/MoldIssueReturn')(sequelize);
const MoldVerificationLog   = require('../modules/mold/model/MoldVerificationLog')(sequelize);
const MoldInspection        = require('../modules/mold/model/MoldInspection')(sequelize);
const MoldInspectionPhoto   = require('../modules/mold/model/MoldInspectionPhoto')(sequelize);
// ── Mold Management — Sprint 5 ───────────────────────────────────────────────
const MoldPmTemplate        = require('../modules/mold/model/MoldPmTemplate')(sequelize);
const MoldPmTemplateItem    = require('../modules/mold/model/MoldPmTemplateItem')(sequelize);
const MoldPmSchedule        = require('../modules/mold/model/MoldPmSchedule')(sequelize);
const MoldPmWorkOrder       = require('../modules/mold/model/MoldPmWorkOrder')(sequelize);
const MoldPmChecklistResult = require('../modules/mold/model/MoldPmChecklistResult')(sequelize);
const MoldPmPhoto           = require('../modules/mold/model/MoldPmPhoto')(sequelize);
const MoldRepairType        = require('../modules/mold/model/MoldRepairType')(sequelize);
const MoldRepairRequest     = require('../modules/mold/model/MoldRepairRequest')(sequelize);
const MoldRepairTracking    = require('../modules/mold/model/MoldRepairTracking')(sequelize);
const MoldRepairCost        = require('../modules/mold/model/MoldRepairCost')(sequelize);
const MoldTrialProtocol     = require('../modules/mold/model/MoldTrialProtocol')(sequelize);
const MoldTrial             = require('../modules/mold/model/MoldTrial')(sequelize);
const MoldTrialParameter    = require('../modules/mold/model/MoldTrialParameter')(sequelize);
const MoldTrialReading      = require('../modules/mold/model/MoldTrialReading')(sequelize);
const MoldTrialPhoto        = require('../modules/mold/model/MoldTrialPhoto')(sequelize);
const MoldCost              = require('../modules/mold/model/MoldCost')(sequelize);
// ── Mold Management — Sprint 6 ───────────────────────────────────────────────
const MoldAiPrediction       = require('../modules/mold/model/MoldAiPrediction')(sequelize);
const MoldPredictionFeedback = require('../modules/mold/model/MoldPredictionFeedback')(sequelize);
const MoldReservation        = require('../modules/mold/model/MoldReservation')(sequelize);
// ── Maintenance Sprint 3 ──────────────────────────────────────────────────────
const EquipmentCategory     = require('../modules/maintenance/model/EquipmentCategory')(sequelize);
const Equipment             = require('../modules/maintenance/model/Equipment')(sequelize);
const EquipmentHierarchy    = require('../modules/maintenance/model/EquipmentHierarchy')(sequelize);
const EquipmentDocument     = require('../modules/maintenance/model/EquipmentDocument')(sequelize);
const EquipmentWarranty     = require('../modules/maintenance/model/EquipmentWarranty')(sequelize);
const MaintenanceType       = require('../modules/maintenance/model/MaintenanceType')(sequelize);
const FailureCode           = require('../modules/maintenance/model/FailureCode')(sequelize);
const MntDowntimeReason     = require('../modules/maintenance/model/DowntimeReason')(sequelize);
const MaintenancePriority   = require('../modules/maintenance/model/MaintenancePriority')(sequelize);
const BreakdownRequest      = require('../modules/maintenance/model/BreakdownRequest')(sequelize);
const MaintenanceWorkOrder  = require('../modules/maintenance/model/MaintenanceWorkOrder')(sequelize);
const MwoTask               = require('../modules/maintenance/model/MwoTask')(sequelize);
const MwoAssignment         = require('../modules/maintenance/model/MwoAssignment')(sequelize);
const MwoDiagnosis          = require('../modules/maintenance/model/MwoDiagnosis')(sequelize);
const DowntimeLog           = require('../modules/maintenance/model/DowntimeLog')(sequelize);
const TechnicianSkill       = require('../modules/maintenance/model/TechnicianSkill')(sequelize);
const TechnicianSkillMapping= require('../modules/maintenance/model/TechnicianSkillMapping')(sequelize);
const EquipmentHealthScore  = require('../modules/maintenance/model/EquipmentHealthScore')(sequelize);
const MachineStatus         = require('../modules/maintenance/model/MachineStatus')(sequelize);
// ── Maintenance Sprint 5 ──────────────────────────────────────────────────────
const PmTemplate            = require('../modules/maintenance/model/PmTemplate')(sequelize);
const PmTemplateItem        = require('../modules/maintenance/model/PmTemplateItem')(sequelize);
const PmSchedule            = require('../modules/maintenance/model/PmSchedule')(sequelize);
const PmWorkOrder           = require('../modules/maintenance/model/PmWorkOrder')(sequelize);
const PmWoChecklist         = require('../modules/maintenance/model/PmWoChecklist')(sequelize);
const SparePart             = require('../modules/maintenance/model/SparePart')(sequelize);
const SparePartBom          = require('../modules/maintenance/model/SparePartBom')(sequelize);
const SparePartConsumption  = require('../modules/maintenance/model/SparePartConsumption')(sequelize);
const LotoProcedure         = require('../modules/maintenance/model/LotoProcedure')(sequelize);
const LotoExecution         = require('../modules/maintenance/model/LotoExecution')(sequelize);
const LotoPermit            = require('../modules/maintenance/model/LotoPermit')(sequelize);
const MaintenanceCost       = require('../modules/maintenance/model/MaintenanceCost')(sequelize);
const SalesInvoice          = require('../modules/accounts/model/SalesInvoice');
const DebitCreditNote       = require('../modules/accounts/model/DebitCreditNote');
const Payment               = require('../modules/accounts/model/Payment');
const CopqEntry             = require('../modules/accounts/model/CopqEntry');
const TallySyncLog          = require('../modules/accounts/model/TallySyncLog');

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

// Item → Quality Params (CTQ)
Item.hasMany(ItemQualityParam, { foreignKey: 'item_id', as: 'QualityParams', onDelete: 'CASCADE' });
ItemQualityParam.belongsTo(Item, { foreignKey: 'item_id' });

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

// Grn — vendor + warehouse + PO link + audit + items
Grn.belongsTo(Vendor,        { foreignKey: 'vendor_id',    as: 'Vendor'        });
Grn.belongsTo(Warehouse,     { foreignKey: 'warehouse_id', as: 'Warehouse'     });
Grn.belongsTo(PurchaseOrder, { foreignKey: 'po_id',        as: 'PurchaseOrder' });
Grn.belongsTo(User,          { foreignKey: 'created_by',   as: 'Creator'       });
Grn.hasMany(GrnItem,         { foreignKey: 'grn_id',       as: 'Items', onDelete: 'CASCADE' });
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
IqcInspection.belongsTo(Ncr,    { foreignKey: 'ncr_id',        as: 'Ncr'       });
IqcInspection.belongsTo(Scar,   { foreignKey: 'scar_id',       as: 'Scar'      });
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
PqcInspection.belongsTo(Package,   { foreignKey: 'package_id',    as: 'Package'   });
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
DispatchOrder.belongsTo(CustomerOrder,  { foreignKey: 'customer_order_id', as: 'CustomerOrder' });
CustomerOrder.hasMany(DispatchOrder,    { foreignKey: 'customer_order_id', as: 'DispatchOrders' });
CustomerOrder.hasMany(WorkOrder,        { foreignKey: 'customer_order_id', as: 'WorkOrders'     });

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

// Instrument — creator + calibration records
Instrument.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Instrument.hasMany(CalibrationRecord, { foreignKey: 'instrument_id', as: 'CalibrationRecords', onDelete: 'CASCADE' });
CalibrationRecord.belongsTo(Instrument, { foreignKey: 'instrument_id', as: 'Instrument' });
CalibrationRecord.belongsTo(User, { foreignKey: 'performed_by', as: 'PerformedBy' });
CalibrationRecord.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });

// Complaint — item + creator + capa + ncr chain links
Complaint.belongsTo(Item, { foreignKey: 'item_id',    as: 'Item'    });
Complaint.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
Complaint.belongsTo(Capa, { foreignKey: 'capa_id',    as: 'Capa'    });
Complaint.belongsTo(Ncr,  { foreignKey: 'ncr_id',     as: 'Ncr'     });

// NCR chain — complaint → NCR → CAPA
Ncr.belongsTo(Complaint, { foreignKey: 'complaint_id', as: 'Complaint' });
Ncr.belongsTo(Capa,      { foreignKey: 'capa_id',      as: 'Capa'      });

// AdminAuditLog — actor
AdminAuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'Actor' });

// MadadChat — user
MadadChat.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

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
// ── Mold Management associations ────────────────────────────────────────────

// Mold → Category, Customer (Vendor), StorageLocation, audit
Mold.belongsTo(MoldCategory,        { foreignKey: 'category_id',         as: 'Category'        });
Mold.belongsTo(Vendor,              { foreignKey: 'customer_id',         as: 'Customer'         });
Mold.belongsTo(MoldStorageLocation, { foreignKey: 'storage_location_id', as: 'StorageLocation'  });
Mold.belongsTo(User,                { foreignKey: 'created_by',          as: 'Creator'          });
Mold.belongsTo(User,                { foreignKey: 'updated_by',          as: 'Updater'          });
MoldCategory.hasMany(Mold,          { foreignKey: 'category_id',         as: 'Molds'            });

// Mold hasMany children
Mold.hasMany(MoldPartMapping,   { foreignKey: 'mold_id', as: 'PartMappings',   onDelete: 'CASCADE' });
Mold.hasMany(MoldMachineCompat, { foreignKey: 'mold_id', as: 'MachineCompats', onDelete: 'CASCADE' });
Mold.hasMany(MoldDocument,      { foreignKey: 'mold_id', as: 'Documents',      onDelete: 'CASCADE' });
Mold.hasMany(MoldCavity,        { foreignKey: 'mold_id', as: 'Cavities',       onDelete: 'CASCADE' });
Mold.hasMany(MoldShotLog,       { foreignKey: 'mold_id', as: 'ShotLogs',       onDelete: 'CASCADE' });
Mold.hasMany(MoldLifeAlert,     { foreignKey: 'mold_id', as: 'LifeAlerts',     onDelete: 'CASCADE' });
Mold.hasMany(MoldLifeExtension, { foreignKey: 'mold_id', as: 'LifeExtensions', onDelete: 'CASCADE' });
Mold.hasMany(MoldIssueReturn,   { foreignKey: 'mold_id', as: 'IssueReturns',   onDelete: 'CASCADE' });
Mold.hasMany(MoldInspection,    { foreignKey: 'mold_id', as: 'Inspections',    onDelete: 'CASCADE' });

// Mold hasOne children (1:1)
Mold.hasOne(MoldQrRegistry,   { foreignKey: 'mold_id', as: 'QrRegistry',  onDelete: 'CASCADE' });
Mold.hasOne(MoldShotSummary,  { foreignKey: 'mold_id', as: 'ShotSummary', onDelete: 'CASCADE' });
Mold.hasOne(MoldLifeConfig,   { foreignKey: 'mold_id', as: 'LifeConfig',  onDelete: 'CASCADE' });

// MoldPartMapping → Item
MoldPartMapping.belongsTo(Mold, { foreignKey: 'mold_id', as: 'Mold' });
MoldPartMapping.belongsTo(Item, { foreignKey: 'item_id', as: 'Item' });

// MoldMachineCompat → Machine
MoldMachineCompat.belongsTo(Mold,    { foreignKey: 'mold_id',    as: 'Mold'    });
MoldMachineCompat.belongsTo(Machine, { foreignKey: 'machine_id', as: 'Machine' });
MoldMachineCompat.belongsTo(User,    { foreignKey: 'verified_by', as: 'VerifiedBy' });

// MoldDocument → Mold
MoldDocument.belongsTo(Mold, { foreignKey: 'mold_id', as: 'Mold' });

// MoldQrRegistry → Mold
MoldQrRegistry.belongsTo(Mold, { foreignKey: 'mold_id', as: 'Mold' });

// MoldCavity → Mold + history
MoldCavity.belongsTo(Mold, { foreignKey: 'mold_id', as: 'Mold' });
MoldCavity.hasMany(CavityHistory, { foreignKey: 'cavity_id', as: 'History', onDelete: 'CASCADE' });
CavityHistory.belongsTo(MoldCavity, { foreignKey: 'cavity_id', as: 'Cavity' });
CavityHistory.belongsTo(Mold,       { foreignKey: 'mold_id',   as: 'Mold' });
CavityHistory.belongsTo(User,       { foreignKey: 'performed_by', as: 'PerformedBy' });

// MoldShotLog → Mold, JobCard, WorkOrder, Machine, User
MoldShotLog.belongsTo(Mold,    { foreignKey: 'mold_id',    as: 'Mold' });
MoldShotLog.belongsTo(Machine, { foreignKey: 'machine_id', as: 'Machine' });
MoldShotLog.belongsTo(User,    { foreignKey: 'logged_by',  as: 'LoggedBy' });

// MoldShotSummary → Mold
MoldShotSummary.belongsTo(Mold, { foreignKey: 'mold_id', as: 'Mold' });

// MoldLifeConfig → Mold + audit
MoldLifeConfig.belongsTo(Mold, { foreignKey: 'mold_id', as: 'Mold' });

// MoldLifeAlert → Mold + acknowledged_by
MoldLifeAlert.belongsTo(Mold, { foreignKey: 'mold_id',        as: 'Mold' });
MoldLifeAlert.belongsTo(User, { foreignKey: 'acknowledged_by', as: 'AcknowledgedBy' });

// MoldLifeExtension → Mold + approved_by + quality_signoff_by
MoldLifeExtension.belongsTo(Mold, { foreignKey: 'mold_id',            as: 'Mold' });
MoldLifeExtension.belongsTo(User, { foreignKey: 'approved_by',        as: 'ApprovedBy' });
MoldLifeExtension.belongsTo(User, { foreignKey: 'quality_signoff_by', as: 'QualitySignoff' });

// MoldIssueReturn → Mold, WorkOrder, Machine, StorageLocation, Users
MoldIssueReturn.belongsTo(Mold,                { foreignKey: 'mold_id',             as: 'Mold'            });
MoldIssueReturn.belongsTo(WorkOrder,           { foreignKey: 'work_order_id',       as: 'WorkOrder'       });
MoldIssueReturn.belongsTo(Machine,             { foreignKey: 'machine_id',          as: 'Machine'         });
MoldIssueReturn.belongsTo(User,                { foreignKey: 'issued_by',           as: 'IssuedBy'        });
MoldIssueReturn.belongsTo(User,                { foreignKey: 'returned_by',         as: 'ReturnedBy'      });
MoldIssueReturn.belongsTo(MoldStorageLocation, { foreignKey: 'storage_location_id', as: 'StorageLocation' });
MoldIssueReturn.hasMany(MoldVerificationLog,   { foreignKey: 'issue_return_id',     as: 'Verifications',  onDelete: 'CASCADE' });

// MoldVerificationLog → IssueReturn, override_by
MoldVerificationLog.belongsTo(MoldIssueReturn, { foreignKey: 'issue_return_id', as: 'IssueReturn' });
MoldVerificationLog.belongsTo(User,            { foreignKey: 'override_by',      as: 'OverrideBy'  });

// MoldInspection → Mold, IssueReturn, inspector
MoldInspection.belongsTo(Mold,            { foreignKey: 'mold_id',         as: 'Mold'        });
MoldInspection.belongsTo(MoldIssueReturn, { foreignKey: 'issue_return_id', as: 'IssueReturn' });
MoldInspection.belongsTo(User,            { foreignKey: 'inspected_by',    as: 'InspectedBy' });
MoldInspection.hasMany(MoldInspectionPhoto, { foreignKey: 'inspection_id', as: 'Photos', onDelete: 'CASCADE' });

// MoldInspectionPhoto → Inspection
MoldInspectionPhoto.belongsTo(MoldInspection, { foreignKey: 'inspection_id', as: 'Inspection' });

// MoldStorageLocation → current mold
MoldStorageLocation.belongsTo(Mold, { foreignKey: 'current_mold_id', as: 'CurrentMold', constraints: false });

// MoldCategory audit
MoldCategory.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
MoldCategory.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// MoldStorageLocation audit
MoldStorageLocation.belongsTo(User, { foreignKey: 'created_by', as: 'Creator' });
MoldStorageLocation.belongsTo(User, { foreignKey: 'updated_by', as: 'Updater' });

// ── Mold Sprint 5 Associations ───────────────────────────────────────────────

// MoldPmTemplate → MoldCategory + items
MoldPmTemplate.belongsTo(MoldCategory,      { foreignKey: 'category_id', as: 'Category' });
MoldPmTemplate.hasMany(MoldPmTemplateItem,  { foreignKey: 'template_id', as: 'Items', onDelete: 'CASCADE' });
MoldPmTemplateItem.belongsTo(MoldPmTemplate,{ foreignKey: 'template_id', as: 'Template' });

// MoldPmSchedule → Mold + Template
MoldPmSchedule.belongsTo(Mold,           { foreignKey: 'mold_id',     as: 'Mold'     });
MoldPmSchedule.belongsTo(MoldPmTemplate, { foreignKey: 'template_id', as: 'Template' });
Mold.hasMany(MoldPmSchedule,             { foreignKey: 'mold_id',     as: 'PmSchedules', onDelete: 'CASCADE' });

// MoldPmWorkOrder → Schedule + Mold + User (assigned_to)
MoldPmWorkOrder.belongsTo(MoldPmSchedule, { foreignKey: 'schedule_id', as: 'Schedule' });
MoldPmWorkOrder.belongsTo(Mold,           { foreignKey: 'mold_id',     as: 'Mold'     });
MoldPmWorkOrder.belongsTo(User,           { foreignKey: 'assigned_to', as: 'AssignedTo' });
MoldPmWorkOrder.hasMany(MoldPmChecklistResult, { foreignKey: 'pm_work_order_id', as: 'ChecklistResults', onDelete: 'CASCADE' });
MoldPmWorkOrder.hasMany(MoldPmPhoto,           { foreignKey: 'pm_work_order_id', as: 'Photos',           onDelete: 'CASCADE' });

// MoldPmChecklistResult → WorkOrder + TemplateItem
MoldPmChecklistResult.belongsTo(MoldPmWorkOrder,  { foreignKey: 'pm_work_order_id', as: 'WorkOrder'    });
MoldPmChecklistResult.belongsTo(MoldPmTemplateItem,{ foreignKey: 'template_item_id', as: 'TemplateItem' });

// MoldPmPhoto → WorkOrder
MoldPmPhoto.belongsTo(MoldPmWorkOrder, { foreignKey: 'pm_work_order_id', as: 'WorkOrder' });

// MoldRepairRequest → Mold + RepairType + Vendor + Users
MoldRepairRequest.belongsTo(Mold,           { foreignKey: 'mold_id',        as: 'Mold'        });
MoldRepairRequest.belongsTo(MoldRepairType, { foreignKey: 'repair_type_id', as: 'RepairType'  });
MoldRepairRequest.belongsTo(Vendor,         { foreignKey: 'vendor_id',      as: 'Vendor'      });
MoldRepairRequest.belongsTo(User,           { foreignKey: 'requested_by',   as: 'RequestedBy' });
MoldRepairRequest.belongsTo(User,           { foreignKey: 'approved_by',    as: 'ApprovedBy'  });
MoldRepairRequest.hasMany(MoldRepairTracking, { foreignKey: 'repair_request_id', as: 'TrackingEvents', onDelete: 'CASCADE' });
MoldRepairRequest.hasMany(MoldRepairCost,     { foreignKey: 'repair_request_id', as: 'Costs',          onDelete: 'CASCADE' });
Mold.hasMany(MoldRepairRequest, { foreignKey: 'mold_id', as: 'RepairRequests', onDelete: 'CASCADE' });

// MoldRepairTracking → RepairRequest + performer
MoldRepairTracking.belongsTo(MoldRepairRequest, { foreignKey: 'repair_request_id', as: 'RepairRequest' });
MoldRepairTracking.belongsTo(User,              { foreignKey: 'performed_by',      as: 'PerformedBy'   });

// MoldRepairCost → RepairRequest + Vendor
MoldRepairCost.belongsTo(MoldRepairRequest, { foreignKey: 'repair_request_id', as: 'RepairRequest' });
MoldRepairCost.belongsTo(Vendor,            { foreignKey: 'vendor_id',         as: 'Vendor'        });

// MoldTrial → Mold + Protocol + Machine + User + RepairRequest
MoldTrial.belongsTo(Mold,              { foreignKey: 'mold_id',           as: 'Mold'        });
MoldTrial.belongsTo(MoldTrialProtocol, { foreignKey: 'protocol_id',       as: 'Protocol'    });
MoldTrial.belongsTo(Machine,           { foreignKey: 'machine_id',        as: 'Machine'     });
MoldTrial.belongsTo(User,              { foreignKey: 'conducted_by',      as: 'ConductedBy' });
MoldTrial.belongsTo(MoldRepairRequest, { foreignKey: 'repair_request_id', as: 'RepairRequest' });
MoldTrial.hasMany(MoldTrialParameter,  { foreignKey: 'trial_id', as: 'Parameters', onDelete: 'CASCADE' });
MoldTrial.hasMany(MoldTrialReading,    { foreignKey: 'trial_id', as: 'Readings',   onDelete: 'CASCADE' });
MoldTrial.hasMany(MoldTrialPhoto,      { foreignKey: 'trial_id', as: 'Photos',     onDelete: 'CASCADE' });
Mold.hasMany(MoldTrial, { foreignKey: 'mold_id', as: 'Trials', onDelete: 'CASCADE' });

// MoldTrialProtocol → MoldCategory
MoldTrialProtocol.belongsTo(MoldCategory, { foreignKey: 'mold_category_id', as: 'MoldCategory' });

// MoldTrialParameter / MoldTrialReading / MoldTrialPhoto → Trial
MoldTrialParameter.belongsTo(MoldTrial, { foreignKey: 'trial_id', as: 'Trial' });
MoldTrialReading.belongsTo(MoldTrial,   { foreignKey: 'trial_id', as: 'Trial' });
MoldTrialPhoto.belongsTo(MoldTrial,     { foreignKey: 'trial_id', as: 'Trial' });

// MoldCost → Mold + Vendor + User
MoldCost.belongsTo(Mold,   { foreignKey: 'mold_id',    as: 'Mold'    });
MoldCost.belongsTo(Vendor, { foreignKey: 'vendor_id',  as: 'Vendor'  });
MoldCost.belongsTo(User,   { foreignKey: 'created_by', as: 'Creator' });
Mold.hasMany(MoldCost,     { foreignKey: 'mold_id',    as: 'Costs',  onDelete: 'CASCADE' });

// ── Mold Sprint 6 associations ───────────────────────────────────────────────

// MoldAiPrediction → Mold + feedback
MoldAiPrediction.belongsTo(Mold, { foreignKey: 'mold_id', as: 'Mold' });
MoldAiPrediction.hasMany(MoldPredictionFeedback, { foreignKey: 'prediction_id', as: 'Feedback', onDelete: 'CASCADE' });
Mold.hasMany(MoldAiPrediction, { foreignKey: 'mold_id', as: 'AiPredictions', onDelete: 'CASCADE' });

// MoldPredictionFeedback → Prediction + Mold + User
MoldPredictionFeedback.belongsTo(MoldAiPrediction, { foreignKey: 'prediction_id', as: 'Prediction' });
MoldPredictionFeedback.belongsTo(Mold,             { foreignKey: 'mold_id',       as: 'Mold'       });
MoldPredictionFeedback.belongsTo(User,             { foreignKey: 'given_by',      as: 'GivenBy'    });

// MoldReservation → Mold + WorkOrder + User
MoldReservation.belongsTo(Mold,      { foreignKey: 'mold_id',       as: 'Mold'       });
MoldReservation.belongsTo(WorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder'  });
MoldReservation.belongsTo(User,      { foreignKey: 'reserved_by',   as: 'ReservedBy' });
Mold.hasMany(MoldReservation, { foreignKey: 'mold_id', as: 'Reservations', onDelete: 'CASCADE' });

// ── Accounts & Finance associations ─────────────────────────────────────────

// SalesInvoice → Customer (Vendor), CustomerOrder, DispatchOrder, User
SalesInvoice.belongsTo(Vendor,        { foreignKey: 'customer_id',       as: 'Customer'      });
SalesInvoice.belongsTo(CustomerOrder, { foreignKey: 'customer_order_id', as: 'CustomerOrder'  });
SalesInvoice.belongsTo(DispatchOrder, { foreignKey: 'dispatch_order_id', as: 'DispatchOrder'  });
SalesInvoice.belongsTo(User,          { foreignKey: 'created_by',        as: 'Creator'        });
SalesInvoice.belongsTo(User,          { foreignKey: 'updated_by',        as: 'Updater'        });

// DebitCreditNote → Vendor (debit supplier), Customer (credit customer), User
DebitCreditNote.belongsTo(Vendor, { foreignKey: 'vendor_id',   as: 'Vendor'     });
DebitCreditNote.belongsTo(Vendor, { foreignKey: 'customer_id', as: 'Customer'   });
DebitCreditNote.belongsTo(User,   { foreignKey: 'approved_by', as: 'ApprovedBy' });
DebitCreditNote.belongsTo(User,   { foreignKey: 'created_by',  as: 'Creator'    });
DebitCreditNote.belongsTo(User,   { foreignKey: 'updated_by',  as: 'Updater'    });

// Payment → Vendor (payable), Customer (receivable), User
Payment.belongsTo(Vendor, { foreignKey: 'vendor_id',   as: 'Vendor'   });
Payment.belongsTo(Vendor, { foreignKey: 'customer_id', as: 'Customer' });
Payment.belongsTo(User,   { foreignKey: 'created_by',  as: 'Creator'  });
Payment.belongsTo(User,   { foreignKey: 'updated_by',  as: 'Updater'  });

// CopqEntry → Item, Department, User
CopqEntry.belongsTo(Item,       { foreignKey: 'item_id',       as: 'Item'       });
CopqEntry.belongsTo(Department, { foreignKey: 'department_id', as: 'Department' });
CopqEntry.belongsTo(User,       { foreignKey: 'created_by',    as: 'Creator'    });
CopqEntry.belongsTo(User,       { foreignKey: 'updated_by',    as: 'Updater'    });

// TallySyncLog — synced_by → User
TallySyncLog.belongsTo(User, { foreignKey: 'synced_by', as: 'SyncedBy' });

// ── Maintenance Sprint 3 Associations ────────────────────────────────────────
// EquipmentCategory
EquipmentCategory.hasMany(Equipment,   { foreignKey: 'category_id', as: 'Equipment' });
EquipmentCategory.hasMany(FailureCode, { foreignKey: 'equipment_category_id', as: 'FailureCodes' });

// Equipment (self-referencing hierarchy)
Equipment.belongsTo(EquipmentCategory, { foreignKey: 'category_id',  as: 'Category' });
Equipment.belongsTo(Equipment,         { foreignKey: 'parent_id',     as: 'Parent' });
Equipment.hasMany(Equipment,           { foreignKey: 'parent_id',     as: 'Children' });
Equipment.hasMany(EquipmentDocument,   { foreignKey: 'equipment_id',  as: 'Documents',    onDelete: 'CASCADE' });
Equipment.hasOne(EquipmentWarranty,    { foreignKey: 'equipment_id',  as: 'Warranty',     onDelete: 'CASCADE' });
Equipment.hasOne(MachineStatus,        { foreignKey: 'equipment_id',  as: 'CurrentStatus',onDelete: 'CASCADE' });
Equipment.hasMany(EquipmentHealthScore,{ foreignKey: 'equipment_id',  as: 'HealthScores', onDelete: 'CASCADE' });
Equipment.hasMany(BreakdownRequest,    { foreignKey: 'equipment_id',  as: 'Breakdowns' });
Equipment.hasMany(MaintenanceWorkOrder,{ foreignKey: 'equipment_id',  as: 'WorkOrders' });
Equipment.hasMany(DowntimeLog,         { foreignKey: 'equipment_id',  as: 'DowntimeLogs' });

// EquipmentDocument, EquipmentWarranty, EquipmentHealthScore, MachineStatus → Equipment
EquipmentDocument.belongsTo(Equipment,    { foreignKey: 'equipment_id', as: 'Equipment' });
EquipmentWarranty.belongsTo(Equipment,    { foreignKey: 'equipment_id', as: 'Equipment' });
EquipmentHealthScore.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'Equipment' });
MachineStatus.belongsTo(Equipment,        { foreignKey: 'equipment_id', as: 'Equipment' });

// FailureCode → EquipmentCategory
FailureCode.belongsTo(EquipmentCategory, { foreignKey: 'equipment_category_id', as: 'EquipmentCategory' });

// BreakdownRequest → Equipment, User, MaintenancePriority, FailureCode
BreakdownRequest.belongsTo(Equipment,          { foreignKey: 'equipment_id',                 as: 'Equipment' });
BreakdownRequest.belongsTo(User,               { foreignKey: 'reported_by',                  as: 'ReportedBy' });
BreakdownRequest.belongsTo(MaintenancePriority,{ foreignKey: 'priority_id',                  as: 'Priority' });
BreakdownRequest.belongsTo(FailureCode,        { foreignKey: 'ai_suggested_failure_code_id', as: 'AiFailureCode' });
BreakdownRequest.hasMany(MaintenanceWorkOrder, { foreignKey: 'breakdown_request_id',          as: 'WorkOrders' });

// MaintenanceWorkOrder
MaintenanceWorkOrder.belongsTo(Equipment,          { foreignKey: 'equipment_id',          as: 'Equipment' });
MaintenanceWorkOrder.belongsTo(BreakdownRequest,   { foreignKey: 'breakdown_request_id',  as: 'Breakdown' });
MaintenanceWorkOrder.belongsTo(MaintenancePriority,{ foreignKey: 'priority_id',           as: 'Priority' });
MaintenanceWorkOrder.belongsTo(User,               { foreignKey: 'assigned_to',           as: 'AssignedTo' });
MaintenanceWorkOrder.belongsTo(User,               { foreignKey: 'assigned_by',           as: 'AssignedBy' });
MaintenanceWorkOrder.belongsTo(User,               { foreignKey: 'created_by',            as: 'CreatedBy' });
MaintenanceWorkOrder.belongsTo(FailureCode,        { foreignKey: 'failure_code_id',       as: 'FailureCode' });
MaintenanceWorkOrder.hasMany(MwoTask,              { foreignKey: 'work_order_id',         as: 'Tasks',       onDelete: 'CASCADE' });
MaintenanceWorkOrder.hasMany(MwoAssignment,        { foreignKey: 'work_order_id',         as: 'Assignments', onDelete: 'CASCADE' });
MaintenanceWorkOrder.hasOne(MwoDiagnosis,          { foreignKey: 'work_order_id',         as: 'Diagnosis',   onDelete: 'CASCADE' });

// MwoTask, MwoAssignment, MwoDiagnosis → MaintenanceWorkOrder
MwoTask.belongsTo(MaintenanceWorkOrder,       { foreignKey: 'work_order_id', as: 'WorkOrder' });
MwoAssignment.belongsTo(MaintenanceWorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
MwoDiagnosis.belongsTo(MaintenanceWorkOrder,  { foreignKey: 'work_order_id', as: 'WorkOrder' });
MwoDiagnosis.belongsTo(FailureCode,           { foreignKey: 'failure_code_id', as: 'FailureCode' });
MwoTask.belongsTo(User,                       { foreignKey: 'completed_by',  as: 'CompletedBy' });
MwoAssignment.belongsTo(User,                 { foreignKey: 'assigned_to',   as: 'AssignedTo' });
MwoAssignment.belongsTo(User,                 { foreignKey: 'assigned_by',   as: 'AssignedBy' });

// DowntimeLog
DowntimeLog.belongsTo(Equipment,            { foreignKey: 'equipment_id',          as: 'Equipment' });
DowntimeLog.belongsTo(MntDowntimeReason,    { foreignKey: 'reason_id',             as: 'Reason' });
DowntimeLog.belongsTo(MaintenanceWorkOrder, { foreignKey: 'work_order_id',         as: 'WorkOrder' });
DowntimeLog.belongsTo(BreakdownRequest,     { foreignKey: 'breakdown_request_id',  as: 'Breakdown' });
DowntimeLog.belongsTo(User,                 { foreignKey: 'logged_by',             as: 'LoggedBy' });

// TechnicianSkillMapping → User, TechnicianSkill
TechnicianSkillMapping.belongsTo(User,            { foreignKey: 'user_id',  as: 'User' });
TechnicianSkillMapping.belongsTo(TechnicianSkill, { foreignKey: 'skill_id', as: 'Skill' });
TechnicianSkill.hasMany(TechnicianSkillMapping,   { foreignKey: 'skill_id', as: 'Technicians' });

// EquipmentHierarchy → Equipment (ancestor + descendant)
EquipmentHierarchy.belongsTo(Equipment, { foreignKey: 'ancestor_id',   as: 'Ancestor' });
EquipmentHierarchy.belongsTo(Equipment, { foreignKey: 'descendant_id', as: 'Descendant' });

// ── Maintenance Sprint 5 Associations ─────────────────────────────────────────
// PmTemplate
PmTemplate.belongsTo(EquipmentCategory, { foreignKey: 'category_id',        as: 'Category' });
PmTemplate.belongsTo(MaintenanceType,   { foreignKey: 'maintenance_type_id', as: 'MaintenanceType' });
PmTemplate.hasMany(PmTemplateItem,      { foreignKey: 'template_id',         as: 'Items' });
PmTemplateItem.belongsTo(PmTemplate,    { foreignKey: 'template_id',         as: 'Template' });

// PmSchedule
PmSchedule.belongsTo(Equipment,  { foreignKey: 'equipment_id', as: 'Equipment' });
PmSchedule.belongsTo(PmTemplate, { foreignKey: 'template_id',  as: 'Template' });
PmSchedule.hasMany(PmWorkOrder,  { foreignKey: 'schedule_id',  as: 'WorkOrders' });

// PmWorkOrder
PmWorkOrder.belongsTo(PmSchedule, { foreignKey: 'schedule_id',  as: 'Schedule' });
PmWorkOrder.belongsTo(Equipment,  { foreignKey: 'equipment_id', as: 'Equipment' });
PmWorkOrder.belongsTo(PmTemplate, { foreignKey: 'template_id',  as: 'Template' });
PmWorkOrder.belongsTo(User,       { foreignKey: 'assigned_to',  as: 'AssignedTo' });
PmWorkOrder.hasMany(PmWoChecklist,{ foreignKey: 'pm_wo_id',     as: 'Checklist' });

// PmWoChecklist
PmWoChecklist.belongsTo(PmWorkOrder,    { foreignKey: 'pm_wo_id',         as: 'PmWorkOrder' });
PmWoChecklist.belongsTo(PmTemplateItem, { foreignKey: 'template_item_id', as: 'TemplateItem' });
PmWoChecklist.belongsTo(User,           { foreignKey: 'completed_by',     as: 'CompletedBy' });

// SparePart
SparePart.belongsTo(Vendor,             { foreignKey: 'supplier_id',   as: 'Supplier' });
SparePart.hasMany(SparePartBom,         { foreignKey: 'spare_part_id', as: 'BomItems' });
SparePart.hasMany(SparePartConsumption, { foreignKey: 'spare_part_id', as: 'Consumptions' });

// SparePartBom
SparePartBom.belongsTo(Equipment,  { foreignKey: 'equipment_id',  as: 'Equipment' });
SparePartBom.belongsTo(SparePart,  { foreignKey: 'spare_part_id', as: 'SparePart' });

// SparePartConsumption
SparePartConsumption.belongsTo(SparePart,            { foreignKey: 'spare_part_id', as: 'SparePart' });
SparePartConsumption.belongsTo(MaintenanceWorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
SparePartConsumption.belongsTo(PmWorkOrder,          { foreignKey: 'pm_wo_id',      as: 'PmWorkOrder' });
SparePartConsumption.belongsTo(User,                 { foreignKey: 'consumed_by',   as: 'ConsumedBy' });

// LotoProcedure
LotoProcedure.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'Equipment' });
LotoProcedure.hasMany(LotoExecution, { foreignKey: 'procedure_id', as: 'Executions' });

// LotoExecution
LotoExecution.belongsTo(Equipment,            { foreignKey: 'equipment_id',  as: 'Equipment' });
LotoExecution.belongsTo(LotoProcedure,        { foreignKey: 'procedure_id',  as: 'Procedure' });
LotoExecution.belongsTo(MaintenanceWorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
LotoExecution.belongsTo(PmWorkOrder,          { foreignKey: 'pm_wo_id',      as: 'PmWorkOrder' });
LotoExecution.belongsTo(User, { foreignKey: 'initiated_by', as: 'InitiatedBy' });
LotoExecution.belongsTo(User, { foreignKey: 'locked_by',    as: 'LockedBy' });
LotoExecution.belongsTo(User, { foreignKey: 'completed_by', as: 'CompletedBy' });
LotoExecution.hasMany(LotoPermit, { foreignKey: 'execution_id', as: 'Permits' });

// LotoPermit
LotoPermit.belongsTo(LotoExecution, { foreignKey: 'execution_id', as: 'Execution' });
LotoPermit.belongsTo(User, { foreignKey: 'issued_to',    as: 'IssuedTo' });
LotoPermit.belongsTo(User, { foreignKey: 'authorized_by',as: 'AuthorizedBy' });

// MaintenanceCost
MaintenanceCost.belongsTo(MaintenanceWorkOrder, { foreignKey: 'work_order_id', as: 'WorkOrder' });
MaintenanceCost.belongsTo(PmWorkOrder,          { foreignKey: 'pm_wo_id',      as: 'PmWorkOrder' });
MaintenanceCost.belongsTo(Equipment,            { foreignKey: 'equipment_id',  as: 'Equipment' });

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
  Instrument,
  CalibrationRecord,
  // Sprint 4: NPD
  Drawing,
  DrawingVersion,
  CheckSheetTemplate,
  CheckSheetDimension,
  Pfmea,
  PfmeaItem,
  PfmeaAction,
  // Mold Management
  MoldCategory,
  MoldStorageLocation,
  Mold,
  MoldPartMapping,
  MoldMachineCompat,
  MoldDocument,
  MoldQrRegistry,
  MoldCavity,
  CavityHistory,
  MoldShotLog,
  MoldShotSummary,
  MoldLifeConfig,
  MoldLifeAlert,
  MoldLifeExtension,
  MoldIssueReturn,
  MoldVerificationLog,
  MoldInspection,
  MoldInspectionPhoto,
  // Mold Sprint 5
  MoldPmTemplate,
  MoldPmTemplateItem,
  MoldPmSchedule,
  MoldPmWorkOrder,
  MoldPmChecklistResult,
  MoldPmPhoto,
  MoldRepairType,
  MoldRepairRequest,
  MoldRepairTracking,
  MoldRepairCost,
  MoldTrialProtocol,
  MoldTrial,
  MoldTrialParameter,
  MoldTrialReading,
  MoldTrialPhoto,
  MoldCost,
  // Mold Sprint 6
  MoldAiPrediction,
  MoldPredictionFeedback,
  MoldReservation,
  SalesInvoice,
  DebitCreditNote,
  Payment,
  CopqEntry,
  TallySyncLog,
  // Sprint 4b: Admin + AI
  ModuleSetting,
  FeatureSetting,
  FieldVisibility,
  AiAgentSetting,
  AdminAuditLog,
  MadadChat,
  // Maintenance Sprint 3
  EquipmentCategory,
  Equipment,
  EquipmentHierarchy,
  EquipmentDocument,
  EquipmentWarranty,
  MaintenanceType,
  FailureCode,
  MntDowntimeReason,
  MaintenancePriority,
  BreakdownRequest,
  MaintenanceWorkOrder,
  MwoTask,
  MwoAssignment,
  MwoDiagnosis,
  DowntimeLog,
  TechnicianSkill,
  TechnicianSkillMapping,
  EquipmentHealthScore,
  MachineStatus,
  // Maintenance Sprint 5
  PmTemplate,
  PmTemplateItem,
  PmSchedule,
  PmWorkOrder,
  PmWoChecklist,
  SparePart,
  SparePartBom,
  SparePartConsumption,
  LotoProcedure,
  LotoExecution,
  LotoPermit,
  MaintenanceCost,
  ItemQualityParam,
};
