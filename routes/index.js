const express = require('express');
const router = express.Router();

const authRoutes         = require('./auth.routes');
const userRoutes         = require('./user.routes');
const auditRoutes        = require('./audit.routes');
const notificationRoutes = require('./notification.routes');
const siteRoutes         = require('./site.routes');
const shiftRoutes        = require('./shift.routes');
const warehouseRoutes    = require('./warehouse.routes');
const machineRoutes              = require('./machine.routes');
const workCenterRoutes           = require('./workCenter.routes');
const routingRoutes              = require('./routing.routes');
const itemRoutes                 = require('./item.routes');
const itemQualityParamRoutes     = require('./itemQualityParam.routes');
const productionParameterRoutes  = require('./productionParameter.routes');
const tagRoutes                  = require('./tag.routes');
const vendorRoutes               = require('./vendor.routes');
const vendorCostingRoutes        = require('./vendorCosting.routes');
const customFieldGroupRoutes     = require('./customFieldGroup.routes');
const integrationRoutes          = require('./integration.routes');
const stickerTemplateRoutes      = require('./stickerTemplate.routes');
const templateRoutes             = require('./template.routes');
const productionFormRoutes       = require('./productionForm.routes');
const uploadRoutes               = require('./upload.routes');
const bomRoutes                  = require('./bom.routes');
const cycleTimeRuleRoutes        = require('./cycleTimeRule.routes');
const downtimeReasonRoutes       = require('./downtimeReason.routes');
const packageRoutes              = require('./package.routes');
const ctqIssueRoutes             = require('./ctqIssue.routes');
const toolRoutes                 = require('./tool.routes');
const reportRoutes               = require('./report.routes');
const rfqRoutes                  = require('./rfq.routes');
const quotationRoutes            = require('./quotation.routes');
const customerOrderRoutes        = require('./customerOrder.routes');
const grnRoutes                  = require('./grn.routes');
const inventoryRoutes            = require('./inventory.routes');
const materialRequestRoutes      = require('./materialRequest.routes');
const issueSlipRoutes            = require('./issueSlip.routes');
const stockAdjustmentRoutes      = require('./stockAdjustment.routes');
const workOrderRoutes            = require('./workOrder.routes');
const jobCardRoutes              = require('./jobCard.routes');
const shiftAssignmentRoutes      = require('./shiftAssignment.routes');
const laborLogRoutes             = require('./laborLog.routes');
const operatorSkillRoutes        = require('./operatorSkill.routes');
const mrpRoutes                  = require('./mrp.routes');
const oeeRoutes                  = require('./oee.routes');
const reworkVoucherRoutes        = require('./reworkVoucher.routes');
const toolManagementRoutes       = require('./toolManagement.routes');
const demandForecastRoutes       = require('./demandForecast.routes');
const iqcInspectionRoutes        = require('./iqcInspection.routes');
const lqcInspectionRoutes        = require('./lqcInspection.routes');
const pqcInspectionRoutes        = require('./pqcInspection.routes');
const oqcInspectionRoutes        = require('./oqcInspection.routes');
const productionScheduleRoutes   = require('./productionSchedule.routes');
const scrapVoucherRoutes         = require('./scrapVoucher.routes');
const jobCostSheetRoutes         = require('./jobCostSheet.routes');
const productionAnalyticsRoutes  = require('./productionAnalytics.routes');
const purchaseOrderRoutes        = require('./purchaseOrder.routes');
const purchaseRequisitionRoutes  = require('./purchaseRequisition.routes');
const vendorRfqRoutes            = require('./vendorRfq.routes');
const procurementAnalyticsRoutes = require('./procurementAnalytics.routes');
const procurementBudgetRoutes    = require('./procurementBudget.routes');
const vendorInvoiceRoutes        = require('./vendorInvoice.routes');
const purchaseReturnRoutes       = require('./purchaseReturn.routes');
const scarRoutes                 = require('./scar.routes');
const subcontractChallanRoutes   = require('./subcontractChallan.routes');
const trainingTopicRoutes         = require('./trainingTopic.routes');
const roleRequirementRoutes       = require('./roleRequirement.routes');
const trainingRecordRoutes        = require('./trainingRecord.routes');
const trainingEffectivenessRoutes = require('./trainingEffectiveness.routes');
const transporterRoutes           = require('./transporter.routes');
const dispatchOrderRoutes         = require('./dispatchOrder.routes');
const deliveryChallanRoutes       = require('./deliveryChallan.routes');
const instrumentRoutes            = require('./instrument.routes');
// Sprint 4
const capaRoutes                  = require('./capa.routes');
// Sprint 6: Global Search
const searchRoutes = require('./search.routes');
// Sprint A: PPAP + Audit Plan
const ppapRoutes                  = require('./ppap.routes');
const auditPlanRoutes             = require('./auditPlan.routes');
const ncrRoutes                   = require('./ncr.routes');
const complaintRoutes             = require('./complaint.routes');
const drawingRoutes               = require('./drawing.routes');
const checkSheetRoutes            = require('./checkSheet.routes');
const pfmeaRoutes                 = require('./pfmea.routes');
const salesInvoiceRoutes          = require('./salesInvoice.routes');
const debitCreditNoteRoutes       = require('./debitCreditNote.routes');
const paymentRoutes               = require('./payment.routes');
const copqEntryRoutes             = require('./copqEntry.routes');
const tallySyncRoutes             = require('./tallySync.routes');
const dashboardRoutes             = require('./dashboard.routes');
// Sprint 5: Admin Control Room & Madad AI
const adminControlRoomRoutes      = require('./admin.routes');
const aiDashboardRoutes           = require('./aiDashboard.routes');
const madadRoutes                 = require('./madad.routes');
const whatsappRoutes              = require('./whatsapp.routes');
// Mold Management — Sprint 3
const moldMasterRoutes      = require('./moldMaster.routes');
const moldCavityRoutes      = require('./moldCavity.routes');
const moldShotCountRoutes   = require('./moldShotCount.routes');
const moldLifeRoutes        = require('./moldLife.routes');
const moldIssueReturnRoutes = require('./moldIssueReturn.routes');
const moldStoreRoutes       = require('./moldStore.routes');
// Mold Management — Sprint 5
const moldPmRoutes          = require('./moldPm.routes');
const moldRepairRoutes      = require('./moldRepair.routes');
const moldTrialRoutes       = require('./moldTrial.routes');
const moldCostRoutes        = require('./moldCost.routes');
const moldDocumentsRoutes   = require('./moldDocuments.routes');
// Mold Management — Sprint 6
const moldAiRoutes          = require('./moldAi.routes');
// MRM Module
const mrmRoutes               = require('./mrm.routes');
// Sprint 1: Visibility
const scoreboardRoutes    = require('./scoreboard.routes');
const andonRoutes         = require('./andon.routes');
const shiftHandoverRoutes = require('./shiftHandover.routes');
// EWI — Electronic Work Instructions
const ewiRoutes = require('./ewi.routes');
// Lot / Batch Traceability
const traceabilityRoutes     = require('./traceability.routes');
// Stock Dashboard — BUG-020
const stockDashboardRoutes   = require('./stockDashboard.routes');
// Maintenance — Sprint 3 & 5
const equipmentMasterRoutes  = require('./equipmentMaster.routes');
const equipmentHealthRoutes  = require('./equipmentHealth.routes');
const breakdownRoutes        = require('./breakdown.routes');
const downtimeRoutes         = require('./downtime.routes');
const pmScheduleRoutes       = require('./pmSchedule.routes');
const sparePartsRoutes       = require('./spareParts.routes');
const lotoRoutes             = require('./loto.routes');
const maintenanceKpiRoutes   = require('./maintenanceKpi.routes');
const maintenanceAiRoutes    = require('./maintenanceAi.routes');

// Mount routes
router.use('/auth',          authRoutes);
router.use('/users',         userRoutes);
router.use('/audit',         auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sites',         siteRoutes);
router.use('/shifts',        shiftRoutes);
router.use('/warehouses',    warehouseRoutes);
router.use('/machines',              machineRoutes);
router.use('/work-centers',          workCenterRoutes);
router.use('/routings',              routingRoutes);
router.use('/items',                 itemRoutes);
router.use('/items/:itemId/quality-params', itemQualityParamRoutes);
router.use('/production-parameters', productionParameterRoutes);
router.use('/tags',                  tagRoutes);
router.use('/vendors',               vendorRoutes);
router.use('/vendor-costings',       vendorCostingRoutes);
router.use('/custom-field-groups',   customFieldGroupRoutes);
router.use('/integrations',          integrationRoutes);
router.use('/sticker-templates',     stickerTemplateRoutes);
router.use('/templates',             templateRoutes);
router.use('/production-forms',      productionFormRoutes);
router.use('/upload',                uploadRoutes);
router.use('/boms',                  bomRoutes);
router.use('/cycle-time-rules',      cycleTimeRuleRoutes);
router.use('/downtime-reasons',      downtimeReasonRoutes);
router.use('/packages',              packageRoutes);
router.use('/ctq-issues',            ctqIssueRoutes);
router.use('/tools',                 toolRoutes);
router.use('/reports',               reportRoutes);
router.use('/rfqs',                  rfqRoutes);
router.use('/quotations',            quotationRoutes);
router.use('/customer-orders',       customerOrderRoutes);
router.use('/grns',                  grnRoutes);
router.use('/inventory',             inventoryRoutes);
router.use('/material-requests',     materialRequestRoutes);
router.use('/issue-slips',           issueSlipRoutes);
router.use('/stock-adjustments',     stockAdjustmentRoutes);
router.use('/work-orders',           workOrderRoutes);
router.use('/job-cards',             jobCardRoutes);
router.use('/shift-assignments',     shiftAssignmentRoutes);
router.use('/labor-logs',            laborLogRoutes);
router.use('/operator-skills',       operatorSkillRoutes);
router.use('/mrp',                   mrpRoutes);
router.use('/oee',                   oeeRoutes);
router.use('/rework-vouchers',       reworkVoucherRoutes);
router.use('/tool-logs',             toolManagementRoutes);
router.use('/demand-forecast',       demandForecastRoutes);
router.use('/iqc-inspections',       iqcInspectionRoutes);
router.use('/lqc-inspections',       lqcInspectionRoutes);
router.use('/pqc-inspections',       pqcInspectionRoutes);
router.use('/oqc-inspections',       oqcInspectionRoutes);
router.use('/production-schedules',  productionScheduleRoutes);
router.use('/scrap-vouchers',        scrapVoucherRoutes);
router.use('/job-cost-sheets',       jobCostSheetRoutes);
router.use('/production-analytics', productionAnalyticsRoutes);
router.use('/search',               searchRoutes);
router.use('/purchase-orders',        purchaseOrderRoutes);
router.use('/purchase-requisitions',  purchaseRequisitionRoutes);
router.use('/vendor-rfqs',            vendorRfqRoutes);
router.use('/procurement-analytics', procurementAnalyticsRoutes);
router.use('/procurement-budgets',   procurementBudgetRoutes);
router.use('/vendor-invoices',       vendorInvoiceRoutes);
router.use('/purchase-returns',      purchaseReturnRoutes);
router.use('/scars',                  scarRoutes);
router.use('/subcontract-challans',  subcontractChallanRoutes);
router.use('/hr/training-topics',         trainingTopicRoutes);
router.use('/hr/role-requirements',       roleRequirementRoutes);
router.use('/hr/training-records',        trainingRecordRoutes);
router.use('/hr/training-effectiveness',  trainingEffectivenessRoutes);
router.use('/dispatch/transporters',      transporterRoutes);
router.use('/dispatch/orders',            dispatchOrderRoutes);
router.use('/dispatch/challans',          deliveryChallanRoutes);
router.use('/quality/instruments',       instrumentRoutes);
// Sprint 4: Quality
router.use('/quality/capa',              capaRoutes);
router.use('/quality/ncr',               ncrRoutes);
router.use('/quality/complaints',        complaintRoutes);
// Sprint A: PPAP + Audit Plan
router.use('/quality/ppap',              ppapRoutes);
router.use('/quality/audit-plans',       auditPlanRoutes);
// Sprint 4: NPD
router.use('/npd/drawings',              drawingRoutes);
router.use('/npd/check-sheets',          checkSheetRoutes);
router.use('/npd/pfmea',                 pfmeaRoutes);
router.use('/sales-invoices',            salesInvoiceRoutes);
router.use('/debit-credit-notes',        debitCreditNoteRoutes);
router.use('/payments',                  paymentRoutes);
router.use('/copq-entries',              copqEntryRoutes);
router.use('/tally-sync',               tallySyncRoutes);
router.use('/dashboard',                dashboardRoutes);
// Sprint 5: Admin Control Room & Madad AI
router.use('/admin/control-room',        adminControlRoomRoutes);
router.use('/admin/ai-dashboard',        aiDashboardRoutes);
router.use('/admin/whatsapp',            whatsappRoutes);
router.use('/madad',                     madadRoutes);
// Mold Management — Sprint 3
router.use('/mold/masters',      moldMasterRoutes);
router.use('/mold/cavities',     moldCavityRoutes);
router.use('/mold/shot-count',   moldShotCountRoutes);
router.use('/mold/life',         moldLifeRoutes);
router.use('/mold/issue-return', moldIssueReturnRoutes);
router.use('/mold/store',        moldStoreRoutes);
// Mold Management — Sprint 5
router.use('/mold/pm',           moldPmRoutes);
router.use('/mold/repair',       moldRepairRoutes);
router.use('/mold/trial',        moldTrialRoutes);
router.use('/mold/cost',         moldCostRoutes);
router.use('/mold/documents',    moldDocumentsRoutes);
// Mold Management — Sprint 6
router.use('/mold/ai',           moldAiRoutes);
// Maintenance — Sprint 3 & 5
router.use('/maintenance/equipment', equipmentMasterRoutes);
router.use('/maintenance/health',    equipmentHealthRoutes);
router.use('/maintenance/breakdown', breakdownRoutes);
router.use('/maintenance/downtime',  downtimeRoutes);
router.use('/maintenance/pm',          pmScheduleRoutes);
router.use('/maintenance/spare-parts', sparePartsRoutes);
router.use('/maintenance/loto',        lotoRoutes);
router.use('/maintenance/kpi',         maintenanceKpiRoutes);
router.use('/maintenance/ai',          maintenanceAiRoutes);
// Process Recipes
const processRecipeRoutes = require('./processRecipe.routes');
// Capacity Scheduler
const capacitySchedulerRoutes = require('./capacityScheduler.routes');
// SPC Control Charts
const spcRoutes = require('./spc.routes');
// WIP Tracking
const wipRoutes = require('./wip.routes');
// QR Code Lookup
const qrLookupRoutes = require('./qrLookup.routes');
router.use('/process-recipes', processRecipeRoutes);
router.use('/capacity-scheduler', capacitySchedulerRoutes);
router.use('/quality/spc', spcRoutes);
router.use('/wip', wipRoutes);
router.use('/qr-lookup', qrLookupRoutes);
// Lot / Batch Traceability
router.use('/ewi', ewiRoutes);
router.use('/traceability', traceabilityRoutes);
// Stock Dashboard — BUG-020
router.use('/stock-dashboard', stockDashboardRoutes);
// MRM Module
router.use('/mrm', mrmRoutes);
// Sprint 1: Visibility
router.use('/production/scoreboard',     scoreboardRoutes);
router.use('/production/andon',          andonRoutes);
router.use('/production/shift-handovers', shiftHandoverRoutes);
// Mobile Operator Interface
const operatorRoutes = require('./operator.routes');
router.use('/operator', operatorRoutes);

// ── TEMPORARY: DB cleanup endpoint (remove after use) ─────────────────────
const { authenticate, authorize } = require('../config/middleware');
router.post('/admin/clear-transactional-data', authenticate, authorize('plant_head', 'it_admin'), async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const tables = [
      'iqc_inspection_results','lqc_inspection_results','pqc_inspection_results','oqc_inspection_results','job_card_qa_results',
      'iqc_inspections','lqc_inspections','pqc_inspections','oqc_inspections',
      'job_cards','production_schedules','wip_movements','labor_logs','rework_vouchers','scrap_vouchers','work_orders',
      'capa_actions','capas','ncrs','customer_complaints','audit_findings','audit_items','audit_plans','spc_data_points','spc_configs',
      'issue_slip_items','issue_slips','grn_items','grns','material_request_items','material_requests',
      'stock_adjustment_items','stock_adjustments','inventory_txns','inventories',
      'purchase_return_items','purchase_returns','purchase_order_items','purchase_orders',
      'purchase_requisition_items','purchase_requisitions','vendor_rfq_quotes','vendor_rfq_vendors','vendor_rfq_items','vendor_rfqs',
      'vendor_invoices','vendor_invoice_items','scars',
      'order_items','customer_orders','quotation_items','quotations','rfq_items','rfqs',
      'delivery_challans','dispatch_order_items','dispatch_orders',
      'sales_invoice_items','sales_invoices','debit_credit_notes','payments','copq_entries',
      'pfmea_actions','pfmea_items','pfmeas','ppap_elements','ppap_submissions','check_sheet_results','check_sheet_templates',
      'mold_documents','mold_part_mappings','mold_pm_checklist_results','mold_pm_work_orders','mold_issue_returns','mold_shot_logs','mold_life_alerts','mold_cavity_details',
      'pm_wo_checklists','pm_work_orders','maintenance_work_orders','breakdown_requests','loto_permits','downtime_logs',
      'subcontract_challan_items','subcontract_challans',
      'shift_handover_items','shift_handovers','notifications','audit_logs','mrm_action_items','mrm_reviews',
      'training_records','role_training_requirements','process_recipe_parameters','process_recipes','ewi_steps','ewi_documents',
    ];
    let cleared = 0, skipped = 0;
    for (const t of tables) {
      try { await sequelize.query(`TRUNCATE TABLE "${t}" CASCADE`, { raw: true }); cleared++; }
      catch (e) { skipped++; }
    }
    return res.json({ success: true, message: `Cleared ${cleared} tables, skipped ${skipped}. Users, items, masters kept.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
