'use strict';

const { Op, literal } = require('sequelize');
const {
  CustomerOrder,
  Complaint,
  CopqEntry,
  DispatchOrder,
  WorkOrder,
  JobCard,
  IqcInspection,
  PqcInspection,
  OqcInspection,
  LqcInspection,
  ScrapVoucher,
  Scar,
  Grn,
  Item,
  Inventory,
  Instrument,
  Ncr,
  Capa,
  MaterialRequest,
  BreakdownRequest,
  MaintenanceWorkOrder,
  DowntimeLog,
  TrainingRecord,
  User,
  Site,
  Machine,
  Equipment,
} = require('../../../models');

// ── Helpers ──────────────────────────────────────────────────────────────────
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function startOfToday() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Helper: get machine IDs for a site (or all if no site_id) ────────────────
async function getMachineIdsForSite(siteId) {
  if (!siteId) return null; // null means no filter
  const machines = await Machine.findAll({
    where: { site_id: siteId, is_active: true },
    attributes: ['id'],
    raw: true,
  });
  return machines.map((m) => m.id);
}

// ── Helper: get equipment IDs for a set of machineIds (or null = no filter) ──
async function getEquipmentIdsForMachines(machineIds) {
  if (!machineIds) return null;
  if (machineIds.length === 0) return [];
  const rows = await Equipment.findAll({
    where: { machine_id: { [Op.in]: machineIds } },
    attributes: ['id'],
    raw: true,
  });
  return rows.map((e) => e.id);
}

function woSiteWhere(machineIds, extraWhere = {}) {
  if (!machineIds) return extraWhere;
  return { ...extraWhere, machine_id: { [Op.in]: machineIds } };
}

// ── GET /dashboard/full — Full Golden Dashboard ───────────────────────────────
const getFullDashboard = async (req, res) => {
  try {
    const monthStart = startOfMonth();
    const today      = startOfToday();
    const monthKey   = currentMonthKey();
    const machineIds    = await getMachineIdsForSite(req.query.site_id);
    const equipmentIds  = await getEquipmentIdsForMachines(machineIds);

    const [
      // Production
      activeWos,
      inProgressWos,
      delayedWos,
      completedWosToday,
      openJobCards,
      closedJobCardsToday,
      scrapToday,
      fpiWaiting,
      // Quality
      iqcPending,
      pqcPending,
      oqcPending,
      lqcToday,
      complaintsMonth,
      openNcrs,
      openCapas,
      instrumentsDue,
      // Quality KPI
      iqcPassMonth,
      iqcTotalMonth,
      pqcPassMonth,
      pqcTotalMonth,
      oqcPassMonth,
      oqcTotalMonth,
      // Inventory
      grnPending,
      lowStockAlerts,
      pendingMRs,
      totalSkus,
      // Dispatch
      pendingShipments,
      dispatchedToday,
      podPending,
      dispatchedOnTimeMonth,
      dispatchedTotalMonth,
      // Maintenance
      openBreakdowns,
      openMwos,
      downtimeToday,
      // Finance
      copqMonth,
      // HR
      totalUsers,
      trainingExpired,
      // Orders
      openOrders,
    ] = await Promise.all([
      // ── Production (site-filtered via machine_id) ──
      WorkOrder.count({ where: woSiteWhere(machineIds, { status: { [Op.in]: ['open', 'in_progress'] } }) }).catch(() => 0),
      WorkOrder.count({ where: woSiteWhere(machineIds, { status: 'in_progress' }) }).catch(() => 0),
      WorkOrder.count({ where: woSiteWhere(machineIds, { status: 'in_progress', planned_end: { [Op.lt]: today } }) }).catch(() => 0),
      WorkOrder.count({ where: woSiteWhere(machineIds, { status: 'completed', updated_at: { [Op.gte]: today } }) }).catch(() => 0),
      JobCard.count({ where: { status: 'open', ...(machineIds ? { machine_id: { [Op.in]: machineIds } } : {}) } }).catch(() => 0),
      JobCard.count({ where: { status: 'closed', updated_at: { [Op.gte]: today }, ...(machineIds ? { machine_id: { [Op.in]: machineIds } } : {}) } }).catch(() => 0),
      ScrapVoucher.count({ where: { scrap_date: today } }).catch(() => 0),
      WorkOrder.count({ where: woSiteWhere(machineIds, { fpi_status: 'pending' }) }).catch(() => 0),

      // ── Quality ──
      IqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
      PqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
      OqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
      LqcInspection.count({ where: { inspection_date: today } }).catch(() => 0),
      Complaint.count({ where: { created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      Ncr.count({ where: { status: { [Op.notIn]: ['closed', 'rejected'] } } }).catch(() => 0),
      Capa.count({ where: { status: { [Op.notIn]: ['closed', 'verified_effective'] } } }).catch(() => 0),
      Instrument.count({ where: { next_due_at: { [Op.lte]: today }, status: 'active' } }).catch(() => 0),

      // ── Quality KPI ──
      IqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      IqcInspection.count({ where: { result: { [Op.in]: ['pass', 'fail'] }, created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      PqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      PqcInspection.count({ where: { result: { [Op.in]: ['pass', 'fail'] }, created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      OqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      OqcInspection.count({ where: { result: { [Op.in]: ['pass', 'fail'] }, created_at: { [Op.gte]: monthStart } } }).catch(() => 0),

      // ── Inventory ──
      Grn.count({ where: { status: 'pending' } }).catch(() => 0),
      Inventory.count({
        include: [{ model: Item, as: 'Item', attributes: [], where: { reorder_point: { [Op.gt]: 0 } } }],
        where: literal('"Inventory"."qty_on_hand" <= "Item"."reorder_point"'),
      }).catch(() => 0),
      MaterialRequest.count({ where: { status: 'pending' } }).catch(() => 0),
      Item.count({ where: { is_active: true } }).catch(() => 0),

      // ── Dispatch ──
      DispatchOrder.count({ where: { status: { [Op.in]: ['confirmed', 'loading'] } } }).catch(() => 0),
      DispatchOrder.count({ where: { status: 'dispatched', dispatch_date: today } }).catch(() => 0),
      DispatchOrder.count({ where: { status: 'dispatched', actual_delivery_date: null } }).catch(() => 0),
      DispatchOrder.count({
        where: { status: 'dispatched', dispatch_date: { [Op.gte]: monthStart } },
        include: [{
          model: CustomerOrder,
          as: 'CustomerOrder',
          attributes: [],
          where: literal('"DispatchOrder"."dispatch_date" <= "CustomerOrder"."delivery_date"'),
          required: true,
        }],
      }).catch(() => 0),
      DispatchOrder.count({
        where: { status: 'dispatched', dispatch_date: { [Op.gte]: monthStart } },
      }).catch(() => 0),

      // ── Maintenance (site-filtered via equipment_id when equipmentIds available) ──
      (equipmentIds !== null && equipmentIds.length === 0)
        ? Promise.resolve(0)
        : BreakdownRequest.count({ where: { status: { [Op.notIn]: ['closed', 'resolved'] }, ...(equipmentIds ? { equipment_id: { [Op.in]: equipmentIds } } : {}) } }).catch(() => 0),
      MaintenanceWorkOrder.count({ where: { status: { [Op.notIn]: ['closed', 'completed'] } } }).catch(() => 0),
      DowntimeLog.count({ where: { createdAt: { [Op.gte]: today } } }).catch(() => 0),

      // ── Finance ──
      CopqEntry.sum('cost_amount', { where: { month_key: monthKey } }).catch(() => 0),

      // ── HR ──
      User.count({ where: { is_active: true } }).catch(() => 0),
      TrainingRecord.count({ where: { status: 'expired' } }).catch(() => 0),

      // ── Orders ──
      CustomerOrder.count({ where: { status: { [Op.in]: ['active', 'in_production'] } } }).catch(() => 0),
    ]);

    // Computed KPIs
    const otdPct = dispatchedTotalMonth > 0
      ? Math.round((dispatchedOnTimeMonth / dispatchedTotalMonth) * 1000) / 10
      : null;

    const totalPassMonth = iqcPassMonth + pqcPassMonth + oqcPassMonth;
    const totalAllMonth  = iqcTotalMonth + pqcTotalMonth + oqcTotalMonth;
    const fpyPct = totalAllMonth > 0
      ? Math.round((totalPassMonth / totalAllMonth) * 1000) / 10
      : null;

    return res.json({
      success: true,
      data: {
        month: monthKey,
        kpis: {
          open_orders:          openOrders,
          customer_complaints:  complaintsMonth,
          otd_pct:              otdPct,
          fpy_pct:              fpyPct,
          copq_amount:          parseFloat(copqMonth) || 0,
          instruments_due:      instrumentsDue,
        },
        production: {
          active_wos:             activeWos,
          in_progress_wos:        inProgressWos,
          delayed_wos:            delayedWos,
          completed_wos_today:    completedWosToday,
          open_job_cards:         openJobCards,
          closed_job_cards_today: closedJobCardsToday,
          scrap_today:            scrapToday,
          fpi_waiting:            fpiWaiting,
        },
        quality: {
          iqc_pending:       iqcPending,
          pqc_pending:       pqcPending,
          oqc_pending:       oqcPending,
          lqc_checks_today:  lqcToday,
          complaints_month:  complaintsMonth,
          open_ncrs:         openNcrs,
          open_capas:        openCapas,
          instruments_due:   instrumentsDue,
        },
        inventory: {
          grn_pending:               grnPending,
          low_stock_alerts:          lowStockAlerts,
          pending_material_requests: pendingMRs,
          total_skus:                totalSkus,
        },
        dispatch: {
          pending_shipments: pendingShipments,
          dispatched_today:  dispatchedToday,
          pod_pending:       podPending,
          otd_pct:           otdPct,
        },
        maintenance: {
          open_breakdowns:       openBreakdowns,
          open_mwos:             openMwos,
          downtime_events_today: downtimeToday,
        },
        hr: {
          total_employees:  totalUsers,
          training_expired: trainingExpired,
        },
      },
    });
  } catch (err) {
    console.error('[Dashboard.getFullDashboard]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /dashboard/kpis — Golden KPIs for Plant Head ─────────────────────────
const getKpis = async (req, res) => {
  try {
    const monthStart = startOfMonth();
    const today = startOfToday();

    const [
      complaintCount,
      copqTotal,
      openOrders,
      dispatchedOnTime,
      dispatchedTotal,
      iqcPass,
      iqcTotal,
      pqcPass,
      pqcTotal,
      oqcPass,
      oqcTotal,
    ] = await Promise.all([
      Complaint.count({ where: { created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      CopqEntry.sum('cost_amount', { where: { month_key: currentMonthKey() } }).catch(() => 0),
      CustomerOrder.count({ where: { status: { [Op.in]: ['active', 'in_production'] } } }).catch(() => 0),
      DispatchOrder.count({
        where: { status: 'dispatched', dispatch_date: { [Op.gte]: monthStart } },
        include: [{
          model: CustomerOrder,
          as: 'CustomerOrder',
          attributes: [],
          where: literal('"DispatchOrder"."dispatch_date" <= "CustomerOrder"."delivery_date"'),
          required: true,
        }],
      }).catch(() => 0),
      DispatchOrder.count({
        where: { status: 'dispatched', dispatch_date: { [Op.gte]: monthStart } },
      }).catch(() => 0),
      IqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      IqcInspection.count({ where: { result: { [Op.in]: ['pass', 'fail'] }, created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      PqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      PqcInspection.count({ where: { result: { [Op.in]: ['pass', 'fail'] }, created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      OqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
      OqcInspection.count({ where: { result: { [Op.in]: ['pass', 'fail'] }, created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
    ]);

    const otdPct = dispatchedTotal > 0
      ? Math.round((dispatchedOnTime / dispatchedTotal) * 1000) / 10
      : null;

    const totalInspPass = iqcPass + pqcPass + oqcPass;
    const totalInspAll  = iqcTotal + pqcTotal + oqcTotal;
    const fpyPct = totalInspAll > 0
      ? Math.round((totalInspPass / totalInspAll) * 1000) / 10
      : null;
    const rejectionPct = fpyPct !== null ? Math.round((100 - fpyPct) * 10) / 10 : null;

    return res.json({
      success: true,
      data: {
        customer_complaints: complaintCount,
        otd_pct:             otdPct,
        fpy_pct:             fpyPct,
        rejection_pct:       rejectionPct,
        copq_amount:         parseFloat(copqTotal) || 0,
        open_orders:         openOrders,
        month:               currentMonthKey(),
      },
    });
  } catch (err) {
    console.error('[Dashboard.getKpis]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /dashboard/role-stats/:role — Role-specific stats ───────────────────
const getRoleStats = async (req, res) => {
  try {
    const { role } = req.params;
    const monthStart = startOfMonth();
    const today = startOfToday();
    let stats = {};

    switch (role) {
      case 'iqc_inspector': {
        const [pending, clearedToday, rejectedToday, instrumentsDue] = await Promise.all([
          IqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
          IqcInspection.count({ where: { result: 'pass', inspection_date: today } }).catch(() => 0),
          IqcInspection.count({ where: { result: 'fail', inspection_date: today } }).catch(() => 0),
          Instrument.count({ where: { next_due_at: { [Op.lte]: today }, status: 'active' } }).catch(() => 0),
        ]);
        stats = { pending_inspections: pending, cleared_today: clearedToday, rejected_today: rejectedToday, instruments_due: instrumentsDue };
        break;
      }

      case 'lqc_inspector': {
        const [fpiPending, hourlyToday, rejectionsToday] = await Promise.all([
          LqcInspection.count({ where: { type: 'fpi', result: 'pending' } }).catch(() => 0),
          LqcInspection.count({ where: { type: 'hourly', inspection_date: today } }).catch(() => 0),
          LqcInspection.count({ where: { result: 'fail', inspection_date: today } }).catch(() => 0),
        ]);
        stats = { fpi_pending: fpiPending, hourly_checks_today: hourlyToday, rejections_today: rejectionsToday };
        break;
      }

      case 'pqc_inspector': {
        const [pending, clearedToday, oqcQueue] = await Promise.all([
          PqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
          PqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: today } } }).catch(() => 0),
          OqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
        ]);
        stats = { pending_final: pending, cleared_today: clearedToday, oqc_queue: oqcQueue };
        break;
      }

      case 'oqc_inspector': {
        const [pending, releasedToday, certsToday, cocsToday] = await Promise.all([
          OqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
          OqcInspection.count({ where: { result: 'pass', created_at: { [Op.gte]: today } } }).catch(() => 0),
          OqcInspection.count({ where: { cert_generated: true, created_at: { [Op.gte]: today } } }).catch(() => 0),
          OqcInspection.count({ where: { coc_generated: true, created_at: { [Op.gte]: today } } }).catch(() => 0),
        ]);
        stats = { pending_oqc: pending, released_today: releasedToday, certs_today: certsToday, cocs_today: cocsToday };
        break;
      }

      case 'store_manager':
      case 'store_incharge': {
        const [grnPending, stockAlerts, issuedToday, totalSkus, pendingMRs] = await Promise.all([
          Grn.count({ where: { status: 'pending' } }).catch(() => 0),
          Inventory.count({
            include: [{ model: Item, as: 'Item', attributes: [], where: { reorder_point: { [Op.gt]: 0 } } }],
            where: literal('"Inventory"."qty_on_hand" <= "Item"."reorder_point"'),
          }).catch(() => 0),
          JobCard.count({ where: { status: 'closed', created_at: { [Op.gte]: today } } }).catch(() => 0),
          Item.count().catch(() => 0),
          MaterialRequest.count({ where: { status: 'pending' } }).catch(() => 0),
        ]);
        stats = {
          grn_pending: grnPending, stock_alerts: stockAlerts,
          issued_today: issuedToday, total_skus: totalSkus,
          pending_material_requests: pendingMRs,
        };
        break;
      }

      case 'production_planner': {
        const [activeWos, onSchedule, delayed, shortageAlerts] = await Promise.all([
          WorkOrder.count({ where: { status: { [Op.in]: ['open', 'in_progress'] } } }).catch(() => 0),
          WorkOrder.count({ where: { status: 'in_progress', planned_end: { [Op.gte]: today } } }).catch(() => 0),
          WorkOrder.count({ where: { status: 'in_progress', planned_end: { [Op.lt]: today } } }).catch(() => 0),
          Inventory.count({
            include: [{ model: Item, as: 'Item', attributes: [], where: { reorder_point: { [Op.gt]: 0 } } }],
            where: literal('"Inventory"."qty_on_hand" <= "Item"."reorder_point"'),
          }).catch(() => 0),
        ]);
        stats = { active_wos: activeWos, on_schedule: onSchedule, delayed, shortage_alerts: shortageAlerts };
        break;
      }

      case 'production_supervisor': {
        const [activeJobs, completedToday, scrapToday, fpiWaiting] = await Promise.all([
          JobCard.count({ where: { status: 'open' } }).catch(() => 0),
          JobCard.count({ where: { status: 'closed', created_at: { [Op.gte]: today } } }).catch(() => 0),
          ScrapVoucher.count({ where: { scrap_date: today } }).catch(() => 0),
          WorkOrder.count({ where: { fpi_status: 'pending' } }).catch(() => 0),
        ]);
        stats = { active_jobs: activeJobs, completed_today: completedToday, scrap_today: scrapToday, fpi_waiting: fpiWaiting };
        break;
      }

      case 'production_manager': {
        const [
          activeJobs, completedToday, scrapToday, fpiWaiting,
          activeWos, inProgressWos, delayedWos, completedWosToday,
          openBreakdowns, openMwos,
        ] = await Promise.all([
          JobCard.count({ where: { status: 'open' } }).catch(() => 0),
          JobCard.count({ where: { status: 'closed', created_at: { [Op.gte]: today } } }).catch(() => 0),
          ScrapVoucher.count({ where: { scrap_date: today } }).catch(() => 0),
          WorkOrder.count({ where: { fpi_status: 'pending' } }).catch(() => 0),
          WorkOrder.count({ where: { status: { [Op.in]: ['open', 'in_progress'] } } }).catch(() => 0),
          WorkOrder.count({ where: { status: 'in_progress' } }).catch(() => 0),
          WorkOrder.count({ where: { status: 'in_progress', planned_end: { [Op.lt]: today } } }).catch(() => 0),
          WorkOrder.count({ where: { status: 'completed', updated_at: { [Op.gte]: today } } }).catch(() => 0),
          BreakdownRequest.count({ where: { status: { [Op.notIn]: ['closed', 'resolved'] } } }).catch(() => 0),
          MaintenanceWorkOrder.count({ where: { status: { [Op.notIn]: ['closed', 'completed'] } } }).catch(() => 0),
        ]);
        stats = {
          active_jobs: activeJobs, completed_today: completedToday,
          scrap_today: scrapToday, fpi_waiting: fpiWaiting,
          active_wos: activeWos, in_progress_wos: inProgressWos,
          delayed_wos: delayedWos, completed_wos_today: completedWosToday,
          open_breakdowns: openBreakdowns, open_mwos: openMwos,
        };
        break;
      }

      case 'procurement_manager': {
        const [openPos, overdueCount, lowStock, scarsOpen] = await Promise.all([
          CustomerOrder.count({ where: { status: 'active' } }).catch(() => 0),
          Scar.count({
            where: {
              required_response_date: { [Op.lt]: today },
              status: { [Op.notIn]: ['closed', 'responded', 'rejected'] },
            },
          }).catch(() => 0),
          Inventory.count({
            include: [{ model: Item, as: 'Item', attributes: [], where: { reorder_point: { [Op.gt]: 0 } } }],
            where: literal('"Inventory"."qty_on_hand" <= "Item"."reorder_point"'),
          }).catch(() => 0),
          Scar.count({ where: { status: { [Op.notIn]: ['closed', 'rejected'] } } }).catch(() => 0),
        ]);
        stats = { open_pos: openPos, overdue_scars: overdueCount, low_stock: lowStock, scars_open: scarsOpen };
        break;
      }

      case 'dispatch_manager': {
        const [pendingShipments, dispatchedToday, podPending] = await Promise.all([
          DispatchOrder.count({ where: { status: { [Op.in]: ['confirmed', 'loading'] } } }).catch(() => 0),
          DispatchOrder.count({ where: { status: 'dispatched', dispatch_date: today } }).catch(() => 0),
          DispatchOrder.count({ where: { status: 'dispatched', actual_delivery_date: null } }).catch(() => 0),
        ]);
        stats = { pending_shipments: pendingShipments, dispatched_today: dispatchedToday, pod_pending: podPending };
        break;
      }

      case 'accounts_manager': {
        const [copqMonth, grnPending, debitNotes] = await Promise.all([
          CopqEntry.sum('cost_amount', { where: { month_key: currentMonthKey() } }).catch(() => 0),
          Grn.count({ where: { status: 'pending' } }).catch(() => 0),
          CopqEntry.count({ where: { created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
        ]);
        stats = { copq_month: parseFloat(copqMonth) || 0, grn_pending: grnPending, debit_notes: debitNotes };
        break;
      }

      case 'hr_admin':
      case 'hr_manager': {
        const [totalEmployees, trainingExpired] = await Promise.all([
          User.count({ where: { is_active: true } }).catch(() => 0),
          TrainingRecord.count({ where: { status: 'expired' } }).catch(() => 0),
        ]);
        stats = { total_employees: totalEmployees, training_expired: trainingExpired };
        break;
      }

      case 'quality_manager': {
        const [
          openNcrs, openCapas, instrumentsDue, complaintsMonth,
          iqcPending, pqcPending, oqcPending, lqcToday,
        ] = await Promise.all([
          Ncr.count({ where: { status: { [Op.notIn]: ['closed', 'rejected'] } } }).catch(() => 0),
          Capa.count({ where: { status: { [Op.notIn]: ['closed', 'verified_effective'] } } }).catch(() => 0),
          Instrument.count({ where: { next_due_at: { [Op.lte]: today }, status: 'active' } }).catch(() => 0),
          Complaint.count({ where: { created_at: { [Op.gte]: monthStart } } }).catch(() => 0),
          IqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
          PqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
          OqcInspection.count({ where: { result: 'pending' } }).catch(() => 0),
          LqcInspection.count({ where: { inspection_date: today } }).catch(() => 0),
        ]);
        stats = {
          open_ncrs: openNcrs, open_capas: openCapas,
          instruments_due: instrumentsDue, complaints_month: complaintsMonth,
          iqc_pending: iqcPending, pqc_pending: pqcPending,
          oqc_pending: oqcPending, lqc_checks_today: lqcToday,
        };
        break;
      }

      default:
        stats = {};
    }

    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[Dashboard.getRoleStats]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /dashboard/multi-plant — Corporate KPIs per site ─────────────────────
const getMultiPlant = async (req, res) => {
  try {
    const sites = await Site.findAll({ where: { is_active: true }, attributes: ['id', 'name', 'code'], order: [['name', 'ASC']] });
    const month = startOfMonth();

    const plants = [];
    const totals = { open_wos: 0, produced_qty: 0, complaints: 0, breakdowns: 0, open_ncrs: 0 };

    for (const site of sites) {
      // Get machines for this site
      const machineIds = (await Machine.findAll({
        where: { site_id: site.id, is_active: true },
        attributes: ['id'],
        raw: true,
      })).map((m) => m.id);

      let open_wos = 0, produced_qty = 0, complaints = 0, breakdowns = 0, open_ncrs = 0;

      if (machineIds.length > 0) {
        // WOs on this site's machines
        open_wos = await WorkOrder.count({
          where: { machine_id: { [Op.in]: machineIds }, status: { [Op.in]: ['released', 'in_progress'] } },
        });

        // Produced this month
        const woData = await WorkOrder.findAll({
          where: { machine_id: { [Op.in]: machineIds }, status: { [Op.in]: ['in_progress', 'completed'] }, actual_start: { [Op.gte]: month } },
          attributes: ['produced_qty'],
          raw: true,
        });
        produced_qty = woData.reduce((s, w) => s + parseFloat(w.produced_qty || 0), 0);
      }

      // Complaints this month (site-agnostic, count all)
      complaints = await Complaint.count({ where: { created_at: { [Op.gte]: month } } });

      // Breakdowns this month — BreakdownRequest links to Equipment, not Machine directly
      const equipmentIds = machineIds.length > 0
        ? (await Equipment.findAll({ where: { machine_id: { [Op.in]: machineIds } }, attributes: ['id'], raw: true })).map((e) => e.id)
        : [];
      breakdowns = await BreakdownRequest.count({
        where: {
          ...(equipmentIds.length > 0 ? { equipment_id: { [Op.in]: equipmentIds } } : {}),
          createdAt: { [Op.gte]: month },
        },
      });

      // Open NCRs
      open_ncrs = await Ncr.count({ where: { status: { [Op.notIn]: ['closed', 'rejected'] } } });

      plants.push({
        site_id: site.id,
        site_name: site.name,
        site_code: site.code,
        machines: machineIds.length,
        open_wos,
        produced_qty: Math.round(produced_qty),
        complaints,
        breakdowns,
        open_ncrs,
      });

      totals.open_wos += open_wos;
      totals.produced_qty += Math.round(produced_qty);
      totals.complaints = complaints; // same global count
      totals.breakdowns += breakdowns;
      totals.open_ncrs = open_ncrs; // same global count
    }

    return res.json({ success: true, data: { plants, totals, as_of: new Date().toISOString() } });
  } catch (err) {
    console.error('[dashboard/multiPlant]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

module.exports = { getKpis, getRoleStats, getFullDashboard, getMultiPlant };
