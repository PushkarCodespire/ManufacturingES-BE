'use strict';

const natural = require('natural');
const { Op } = require('sequelize');

// ── Classifier ──────────────────────────────────────────────────────────────
const classifier = new natural.BayesClassifier();

// ── Session Memory ────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const sessionStore   = new Map();

function getSession(sid) {
  const s = sessionStore.get(sid);
  if (!s || Date.now() > s.expiresAt) return {};
  return s;
}
function setSession(sid, data) {
  sessionStore.set(sid, { ...data, expiresAt: Date.now() + SESSION_TTL_MS });
}
// Purge expired sessions every 15 minutes (unref so it doesn't block process exit)
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessionStore.entries()) { if (now > s.expiresAt) sessionStore.delete(id); }
}, 15 * 60 * 1000).unref();

// ── Follow-up Detection ───────────────────────────────────────────────────────
// Phrases that signal the user is continuing from the last response, not starting fresh.
const FOLLOWUP_TRIGGERS = {
  more:   ['show more', 'aur dikhao', 'more results', 'aur batao', 'next page', 'aur bhi dikhao', 'more please', 'aage dikhao', 'aur do'],
  today:  ['aaj ka', 'aaj ke', "today's", 'sirf aaj', 'only today', 'just today'],
  week:   ['is hafte', 'is week', 'this week', 'week mein', 'hafte mein', 'weekly'],
  month:  ['is mahine', 'is month', 'this month', 'mahine mein', 'current month', 'monthly'],
  repeat: ['wahi phir', 'phir se dikhao', 'dobara dikhao', 'same again', 'repeat karo', 'ek baar aur'],
};

function detectFollowup(input) {
  for (const [type, phrases] of Object.entries(FOLLOWUP_TRIGGERS)) {
    if (phrases.some((p) => input.includes(p))) return type;
  }
  return null;
}

function buildDateFilter(type) {
  const now = new Date();
  if (type === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { from: s, to: e, label: 'Aaj' };
  }
  if (type === 'week') {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { from: s, to: e, label: 'Is Hafte' };
  }
  if (type === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { from: s, to: e, label: 'Is Mahine' };
  }
  return {};
}

// ── Training Data ───────────────────────────────────────────────────────────
const TRAINING_DATA = [
  // ─── Greetings ───
  { text: 'hi', intent: 'greeting' },
  { text: 'hello', intent: 'greeting' },
  { text: 'hey', intent: 'greeting' },
  { text: 'namaste', intent: 'greeting' },
  { text: 'kaise ho', intent: 'greeting' },
  { text: 'good morning', intent: 'greeting' },
  { text: 'good evening', intent: 'greeting' },
  { text: 'good afternoon', intent: 'greeting' },
  { text: 'kya haal hai', intent: 'greeting' },
  { text: 'howdy', intent: 'greeting' },
  { text: 'hii', intent: 'greeting' },
  { text: 'helo', intent: 'greeting' },
  { text: 'namaskar', intent: 'greeting' },

  // ─── Goodbye ───
  { text: 'bye', intent: 'goodbye' },
  { text: 'goodbye', intent: 'goodbye' },
  { text: 'alvida', intent: 'goodbye' },
  { text: 'tata', intent: 'goodbye' },
  { text: 'see you', intent: 'goodbye' },
  { text: 'phir milenge', intent: 'goodbye' },
  { text: 'bye bye', intent: 'goodbye' },
  { text: 'good night', intent: 'goodbye' },

  // ─── Thanks ───
  { text: 'thanks', intent: 'thanks' },
  { text: 'thank you', intent: 'thanks' },
  { text: 'shukriya', intent: 'thanks' },
  { text: 'dhanyavaad', intent: 'thanks' },
  { text: 'thanku', intent: 'thanks' },
  { text: 'bahut shukriya', intent: 'thanks' },

  // ─── Roles ───
  { text: 'what are the roles', intent: 'roles' },
  { text: 'roles list', intent: 'roles' },
  { text: 'kitne roles hain', intent: 'roles' },
  { text: 'user roles', intent: 'roles' },
  { text: 'role types', intent: 'roles' },
  { text: 'show roles', intent: 'roles' },
  { text: 'all roles', intent: 'roles' },
  { text: 'roles dikhao', intent: 'roles' },
  { text: 'konse roles hain', intent: 'roles' },
  { text: 'role list dikhao', intent: 'roles' },

  // ─── Departments ───
  { text: 'departments', intent: 'departments' },
  { text: 'vibhag', intent: 'departments' },
  { text: 'dept list', intent: 'departments' },
  { text: 'kitne departments hain', intent: 'departments' },
  { text: 'department list', intent: 'departments' },
  { text: 'show departments', intent: 'departments' },
  { text: 'all departments', intent: 'departments' },
  { text: 'departments dikhao', intent: 'departments' },
  { text: 'konse department hain', intent: 'departments' },
  { text: 'department batao', intent: 'departments' },

  // ─── Users (general count/summary) ───
  { text: 'kitne users hain', intent: 'users' },
  { text: 'total users', intent: 'users' },
  { text: 'user count', intent: 'users' },
  { text: 'how many users', intent: 'users' },
  { text: 'active users', intent: 'users' },
  { text: 'employees count', intent: 'users' },
  { text: 'kitne employees hain', intent: 'users' },
  { text: 'total employees', intent: 'users' },
  { text: 'users dikhao', intent: 'users' },
  { text: 'show all employees', intent: 'users' },
  { text: 'all users', intent: 'users' },
  { text: 'sabhi employees', intent: 'users' },

  // ─── Department Users ───
  { text: 'show hr employees', intent: 'department_users' },
  { text: 'email of hr', intent: 'department_users' },
  { text: 'hr team', intent: 'department_users' },
  { text: 'quality team', intent: 'department_users' },
  { text: 'production team', intent: 'department_users' },
  { text: 'procurement team', intent: 'department_users' },
  { text: 'store team', intent: 'department_users' },
  { text: 'dispatch team', intent: 'department_users' },
  { text: 'accounts team', intent: 'department_users' },
  { text: 'management team', intent: 'department_users' },
  { text: 'show email of quality', intent: 'department_users' },
  { text: 'hr ke employees', intent: 'department_users' },
  { text: 'quality ke log', intent: 'department_users' },
  { text: 'production mein kaun hai', intent: 'department_users' },
  { text: 'who is in hr', intent: 'department_users' },
  { text: 'who is in quality', intent: 'department_users' },
  { text: 'who is in production', intent: 'department_users' },
  { text: 'show details of hr', intent: 'department_users' },
  { text: 'email id of hr', intent: 'department_users' },
  { text: 'phone number of quality', intent: 'department_users' },
  { text: 'contact of production', intent: 'department_users' },
  { text: 'hr wale kaun hain', intent: 'department_users' },
  { text: 'quality department ke employees', intent: 'department_users' },
  { text: 'production department employees', intent: 'department_users' },
  { text: 'procurement employees', intent: 'department_users' },

  // ─── Employee Lookup ───
  { text: 'find employee', intent: 'employee_lookup' },
  { text: 'search employee', intent: 'employee_lookup' },
  { text: 'employee details', intent: 'employee_lookup' },
  { text: 'kaun hai ye employee', intent: 'employee_lookup' },
  { text: 'employee ka detail', intent: 'employee_lookup' },
  { text: 'user details', intent: 'employee_lookup' },

  // ─── Items / Products ───
  { text: 'items list', intent: 'items' },
  { text: 'kitne items hain', intent: 'items' },
  { text: 'total items', intent: 'items' },
  { text: 'how many items', intent: 'items' },
  { text: 'item count', intent: 'items' },
  { text: 'show items', intent: 'items' },
  { text: 'products', intent: 'items' },
  { text: 'raw materials', intent: 'items' },
  { text: 'items dikhao', intent: 'items' },
  { text: 'item types', intent: 'items' },
  { text: 'finished goods', intent: 'items' },
  { text: 'semi finished goods', intent: 'items' },
  { text: 'mro items', intent: 'items' },

  // ─── Machines / Equipment ───
  { text: 'machines', intent: 'machines' },
  { text: 'machine list', intent: 'machines' },
  { text: 'kitni machines hain', intent: 'machines' },
  { text: 'total machines', intent: 'machines' },
  { text: 'how many machines', intent: 'machines' },
  { text: 'show machines', intent: 'machines' },
  { text: 'machines dikhao', intent: 'machines' },
  { text: 'equipment list', intent: 'machines' },

  // ─── Vendors / Suppliers / Customers ───
  { text: 'vendors', intent: 'vendors' },
  { text: 'vendor list', intent: 'vendors' },
  { text: 'kitne vendors hain', intent: 'vendors' },
  { text: 'total vendors', intent: 'vendors' },
  { text: 'suppliers', intent: 'vendors' },
  { text: 'customers list', intent: 'vendors' },
  { text: 'kitne customers hain', intent: 'vendors' },
  { text: 'show vendors', intent: 'vendors' },
  { text: 'vendor dikhao', intent: 'vendors' },
  { text: 'list all vendors', intent: 'vendors' },
  { text: 'all suppliers', intent: 'vendors' },
  { text: 'jobwork vendors', intent: 'vendors' },
  { text: 'vendor details', intent: 'vendors' },
  { text: 'partner list', intent: 'vendors' },

  // ─── Customers (list) ───
  { text: 'show all customers', intent: 'customers' },
  { text: 'customer list', intent: 'customers' },
  { text: 'all customers', intent: 'customers' },
  { text: 'customers dikhao', intent: 'customers' },
  { text: 'kitne customers hain', intent: 'customers' },
  { text: 'how many customers', intent: 'customers' },
  { text: 'total customers', intent: 'customers' },
  { text: 'customer details', intent: 'customers' },

  // ─── Customer Orders ───
  { text: 'customer orders', intent: 'customer_orders' },
  { text: 'customer po', intent: 'customer_orders' },
  { text: 'customer purchase order', intent: 'customer_orders' },
  { text: 'kitne customer orders hain', intent: 'customer_orders' },
  { text: 'open customer orders', intent: 'customer_orders' },
  { text: 'pending customer orders', intent: 'customer_orders' },
  { text: 'customer order status', intent: 'customer_orders' },
  { text: 'sales orders', intent: 'customer_orders' },
  { text: 'order book', intent: 'customer_orders' },
  { text: 'active orders', intent: 'customer_orders' },
  { text: 'customer orders dikhao', intent: 'customer_orders' },

  // ─── Purchase Orders ───
  { text: 'purchase orders', intent: 'purchase_orders' },
  { text: 'po list', intent: 'purchase_orders' },
  { text: 'kitne po hain', intent: 'purchase_orders' },
  { text: 'purchase order status', intent: 'purchase_orders' },
  { text: 'po dikhao', intent: 'purchase_orders' },
  { text: 'pending po', intent: 'purchase_orders' },
  { text: 'open purchase orders', intent: 'purchase_orders' },
  { text: 'po stats', intent: 'purchase_orders' },
  { text: 'show po number', intent: 'purchase_orders' },

  // ─── GRN (Goods Receipt Notes) ───
  { text: 'grn', intent: 'grns' },
  { text: 'grn list', intent: 'grns' },
  { text: 'goods receipt', intent: 'grns' },
  { text: 'goods receipt note', intent: 'grns' },
  { text: 'kitne grn hain', intent: 'grns' },
  { text: 'pending grn', intent: 'grns' },
  { text: 'grn status', intent: 'grns' },
  { text: 'grn dikhao', intent: 'grns' },
  { text: 'material received', intent: 'grns' },
  { text: 'incoming material', intent: 'grns' },
  { text: 'aaj ka grn', intent: 'grns' },
  { text: 'grn approved', intent: 'grns' },

  // ─── IQC Inspections ───
  { text: 'iqc', intent: 'iqc_inspections' },
  { text: 'iqc inspection', intent: 'iqc_inspections' },
  { text: 'incoming quality check', intent: 'iqc_inspections' },
  { text: 'iqc list', intent: 'iqc_inspections' },
  { text: 'iqc status', intent: 'iqc_inspections' },
  { text: 'iqc pass fail', intent: 'iqc_inspections' },
  { text: 'iqc result', intent: 'iqc_inspections' },
  { text: 'iqc pending', intent: 'iqc_inspections' },
  { text: 'iqc rejection rate', intent: 'iqc_inspections' },
  { text: 'incoming inspection', intent: 'iqc_inspections' },
  { text: 'iqc dikhao', intent: 'iqc_inspections' },

  // ─── LQC Inspections ───
  { text: 'lqc', intent: 'lqc_inspections' },
  { text: 'lqc inspection', intent: 'lqc_inspections' },
  { text: 'line quality check', intent: 'lqc_inspections' },
  { text: 'lqc list', intent: 'lqc_inspections' },
  { text: 'lqc status', intent: 'lqc_inspections' },
  { text: 'lqc result', intent: 'lqc_inspections' },
  { text: 'line inspection', intent: 'lqc_inspections' },
  { text: 'lqc dikhao', intent: 'lqc_inspections' },

  // ─── PQC Inspections ───
  { text: 'pqc', intent: 'pqc_inspections' },
  { text: 'pqc inspection', intent: 'pqc_inspections' },
  { text: 'process quality check', intent: 'pqc_inspections' },
  { text: 'pqc list', intent: 'pqc_inspections' },
  { text: 'pqc status', intent: 'pqc_inspections' },
  { text: 'pqc result', intent: 'pqc_inspections' },
  { text: 'packing inspection', intent: 'pqc_inspections' },
  { text: 'pqc dikhao', intent: 'pqc_inspections' },

  // ─── OQC Inspections ───
  { text: 'oqc', intent: 'oqc_inspections' },
  { text: 'oqc inspection', intent: 'oqc_inspections' },
  { text: 'outgoing quality check', intent: 'oqc_inspections' },
  { text: 'oqc list', intent: 'oqc_inspections' },
  { text: 'oqc status', intent: 'oqc_inspections' },
  { text: 'oqc result', intent: 'oqc_inspections' },
  { text: 'final inspection', intent: 'oqc_inspections' },
  { text: 'oqc dikhao', intent: 'oqc_inspections' },

  // ─── Work Orders ───
  { text: 'work orders', intent: 'work_orders' },
  { text: 'work order list', intent: 'work_orders' },
  { text: 'production orders', intent: 'work_orders' },
  { text: 'kitne work orders hain', intent: 'work_orders' },
  { text: 'active work orders', intent: 'work_orders' },
  { text: 'wo status', intent: 'work_orders' },
  { text: 'work orders dikhao', intent: 'work_orders' },
  { text: 'pending work orders', intent: 'work_orders' },
  { text: 'production plan', intent: 'work_orders' },
  { text: 'today production', intent: 'work_orders' },
  { text: 'aaj ka production', intent: 'work_orders' },

  // ─── Job Cards ───
  { text: 'job cards', intent: 'job_cards' },
  { text: 'job card list', intent: 'job_cards' },
  { text: 'job card status', intent: 'job_cards' },
  { text: 'kitne job cards hain', intent: 'job_cards' },
  { text: 'job card dikhao', intent: 'job_cards' },
  { text: 'production job cards', intent: 'job_cards' },
  { text: 'open job cards', intent: 'job_cards' },
  { text: 'active job cards', intent: 'job_cards' },

  // ─── Subcontract Challans (Jobwork) ───
  { text: 'subcontract challan', intent: 'subcontract_challans' },
  { text: 'jobwork challan', intent: 'subcontract_challans' },
  { text: 'jobwork', intent: 'subcontract_challans' },
  { text: 'current jobworks', intent: 'subcontract_challans' },
  { text: 'pending jobwork', intent: 'subcontract_challans' },
  { text: 'outward challan', intent: 'subcontract_challans' },
  { text: 'pending outward challans', intent: 'subcontract_challans' },
  { text: 'challan list', intent: 'subcontract_challans' },
  { text: 'challan status', intent: 'subcontract_challans' },
  { text: 'subcontracting', intent: 'subcontract_challans' },
  { text: 'material sent for jobwork', intent: 'subcontract_challans' },
  { text: 'challan dikhao', intent: 'subcontract_challans' },
  { text: 'kitne challan pending hain', intent: 'subcontract_challans' },

  // ─── Dispatch Orders ───
  { text: 'dispatch orders', intent: 'dispatch_orders' },
  { text: 'dispatch list', intent: 'dispatch_orders' },
  { text: 'dispatch status', intent: 'dispatch_orders' },
  { text: 'pending dispatch', intent: 'dispatch_orders' },
  { text: 'shipping orders', intent: 'dispatch_orders' },
  { text: 'kitne dispatch pending hain', intent: 'dispatch_orders' },
  { text: 'dispatch dikhao', intent: 'dispatch_orders' },
  { text: 'delivery orders', intent: 'dispatch_orders' },
  { text: 'ready for dispatch', intent: 'dispatch_orders' },
  { text: 'aaj ka dispatch', intent: 'dispatch_orders' },

  // ─── Delivery Challans ───
  { text: 'delivery challan', intent: 'delivery_challans' },
  { text: 'delivery challan list', intent: 'delivery_challans' },
  { text: 'delivery challan status', intent: 'delivery_challans' },
  { text: 'dc list', intent: 'delivery_challans' },
  { text: 'dc status', intent: 'delivery_challans' },
  { text: 'delivery challan dikhao', intent: 'delivery_challans' },

  // ─── Material Requests ───
  { text: 'material request', intent: 'material_requests' },
  { text: 'material requests', intent: 'material_requests' },
  { text: 'material request list', intent: 'material_requests' },
  { text: 'pending material requests', intent: 'material_requests' },
  { text: 'material requisition', intent: 'material_requests' },
  { text: 'mr list', intent: 'material_requests' },
  { text: 'mr pending', intent: 'material_requests' },
  { text: 'material demand', intent: 'material_requests' },
  { text: 'material mangwana hai', intent: 'material_requests' },
  { text: 'store se material chahiye', intent: 'material_requests' },

  // ─── Issue Slips ───
  { text: 'issue slip', intent: 'issue_slips' },
  { text: 'issue slips', intent: 'issue_slips' },
  { text: 'issue slip list', intent: 'issue_slips' },
  { text: 'material issued', intent: 'issue_slips' },
  { text: 'kitna material issue hua', intent: 'issue_slips' },
  { text: 'issue slip dikhao', intent: 'issue_slips' },
  { text: 'material issuance', intent: 'issue_slips' },

  // ─── Inventory / Stock ───
  { text: 'inventory', intent: 'inventory' },
  { text: 'stock', intent: 'inventory' },
  { text: 'stock level', intent: 'inventory' },
  { text: 'inventory status', intent: 'inventory' },
  { text: 'kitna stock hai', intent: 'inventory' },
  { text: 'warehouse stock', intent: 'inventory' },
  { text: 'stock dikhao', intent: 'inventory' },
  { text: 'low stock', intent: 'inventory' },
  { text: 'stock summary', intent: 'inventory' },
  { text: 'godown mein kitna maal hai', intent: 'inventory' },

  // ─── Stock Adjustments ───
  { text: 'stock adjustment', intent: 'stock_adjustments' },
  { text: 'stock adjustments', intent: 'stock_adjustments' },
  { text: 'adjustment list', intent: 'stock_adjustments' },
  { text: 'stock correction', intent: 'stock_adjustments' },
  { text: 'inventory adjustment', intent: 'stock_adjustments' },

  // ─── Complaints ───
  { text: 'complaints', intent: 'complaints' },
  { text: 'customer complaints', intent: 'complaints' },
  { text: 'kitni complaints hain', intent: 'complaints' },
  { text: 'open complaints', intent: 'complaints' },
  { text: 'complaint status', intent: 'complaints' },
  { text: 'complaint count', intent: 'complaints' },
  { text: 'complaints dikhao', intent: 'complaints' },
  { text: 'pending complaints', intent: 'complaints' },
  { text: 'customer ne complaint ki', intent: 'complaints' },
  { text: 'complaint summary', intent: 'complaints' },

  // ─── NCRs ───
  { text: 'ncr', intent: 'ncrs' },
  { text: 'ncrs', intent: 'ncrs' },
  { text: 'non conformance', intent: 'ncrs' },
  { text: 'ncr list', intent: 'ncrs' },
  { text: 'kitne ncr hain', intent: 'ncrs' },
  { text: 'open ncrs', intent: 'ncrs' },
  { text: 'ncr status', intent: 'ncrs' },
  { text: 'ncr dikhao', intent: 'ncrs' },
  { text: 'pending ncr', intent: 'ncrs' },
  { text: 'rejection report', intent: 'ncrs' },

  // ─── CAPAs ───
  { text: 'capa', intent: 'capas' },
  { text: 'capas', intent: 'capas' },
  { text: 'corrective actions', intent: 'capas' },
  { text: 'capa list', intent: 'capas' },
  { text: 'open capas', intent: 'capas' },
  { text: 'capa status', intent: 'capas' },
  { text: 'kitne capa hain', intent: 'capas' },
  { text: 'pending capa', intent: 'capas' },
  { text: 'preventive actions', intent: 'capas' },
  { text: 'capa effectiveness', intent: 'capas' },

  // ─── SCARs (Supplier Corrective Actions) ───
  { text: 'scar', intent: 'scars' },
  { text: 'scars', intent: 'scars' },
  { text: 'supplier corrective action', intent: 'scars' },
  { text: 'scar list', intent: 'scars' },
  { text: 'scar status', intent: 'scars' },
  { text: 'vendor scar', intent: 'scars' },
  { text: 'pending scars', intent: 'scars' },

  // ─── Instruments / Calibration ───
  { text: 'instruments', intent: 'instruments' },
  { text: 'calibration', intent: 'instruments' },
  { text: 'instrument list', intent: 'instruments' },
  { text: 'calibration due', intent: 'instruments' },
  { text: 'overdue calibration', intent: 'instruments' },
  { text: 'gauges', intent: 'instruments' },
  { text: 'measuring instruments', intent: 'instruments' },
  { text: 'calibration status', intent: 'instruments' },
  { text: 'instruments dikhao', intent: 'instruments' },
  { text: 'calibration pending', intent: 'instruments' },

  // ─── Drawings / NPD ───
  { text: 'drawings', intent: 'drawings' },
  { text: 'drawing list', intent: 'drawings' },
  { text: 'engineering drawings', intent: 'drawings' },
  { text: 'drawing status', intent: 'drawings' },
  { text: 'pending drawings', intent: 'drawings' },
  { text: 'drawing approval', intent: 'drawings' },
  { text: 'drawings dikhao', intent: 'drawings' },
  { text: 'drawing revision', intent: 'drawings' },
  { text: 'npd drawings', intent: 'drawings' },

  // ─── PFMEA ───
  { text: 'pfmea', intent: 'pfmeas' },
  { text: 'pfmea list', intent: 'pfmeas' },
  { text: 'process fmea', intent: 'pfmeas' },
  { text: 'failure mode analysis', intent: 'pfmeas' },
  { text: 'pfmea status', intent: 'pfmeas' },
  { text: 'pfmea dikhao', intent: 'pfmeas' },
  { text: 'fmea', intent: 'pfmeas' },
  { text: 'high rpn', intent: 'pfmeas' },

  // ─── BOM (Bill of Materials) ───
  { text: 'bom', intent: 'boms' },
  { text: 'bill of materials', intent: 'boms' },
  { text: 'bom list', intent: 'boms' },
  { text: 'bom status', intent: 'boms' },
  { text: 'bom dikhao', intent: 'boms' },
  { text: 'kitne bom hain', intent: 'boms' },

  // ─── Sales Invoices ───
  { text: 'sales invoice', intent: 'sales_invoices' },
  { text: 'sales invoices', intent: 'sales_invoices' },
  { text: 'invoice list', intent: 'sales_invoices' },
  { text: 'invoice status', intent: 'sales_invoices' },
  { text: 'pending invoices', intent: 'sales_invoices' },
  { text: 'kitne invoices hain', intent: 'sales_invoices' },
  { text: 'invoice amount', intent: 'sales_invoices' },
  { text: 'billing summary', intent: 'sales_invoices' },
  { text: 'invoice dikhao', intent: 'sales_invoices' },
  { text: 'total billing', intent: 'sales_invoices' },
  { text: 'tally sync status', intent: 'sales_invoices' },

  // ─── Payments ───
  { text: 'payments', intent: 'payments' },
  { text: 'payment list', intent: 'payments' },
  { text: 'pending payments', intent: 'payments' },
  { text: 'payment status', intent: 'payments' },
  { text: 'kitne payments pending hain', intent: 'payments' },
  { text: 'payment summary', intent: 'payments' },
  { text: 'payments dikhao', intent: 'payments' },

  // ─── Debit/Credit Notes ───
  { text: 'debit note', intent: 'debit_credit_notes' },
  { text: 'credit note', intent: 'debit_credit_notes' },
  { text: 'debit credit notes', intent: 'debit_credit_notes' },
  { text: 'dcn list', intent: 'debit_credit_notes' },
  { text: 'debit notes dikhao', intent: 'debit_credit_notes' },

  // ─── Scrap Vouchers ───
  { text: 'scrap voucher', intent: 'scrap_vouchers' },
  { text: 'scrap list', intent: 'scrap_vouchers' },
  { text: 'scrap report', intent: 'scrap_vouchers' },
  { text: 'kitna scrap hua', intent: 'scrap_vouchers' },
  { text: 'rejection scrap', intent: 'scrap_vouchers' },
  { text: 'scrap dikhao', intent: 'scrap_vouchers' },
  { text: 'scrap quantity', intent: 'scrap_vouchers' },

  // ─── RFQs ───
  { text: 'rfq', intent: 'rfqs' },
  { text: 'rfq list', intent: 'rfqs' },
  { text: 'request for quotation', intent: 'rfqs' },
  { text: 'rfq status', intent: 'rfqs' },
  { text: 'pending rfqs', intent: 'rfqs' },

  // ─── Quotations ───
  { text: 'quotation', intent: 'quotations' },
  { text: 'quotation list', intent: 'quotations' },
  { text: 'quotations', intent: 'quotations' },
  { text: 'quote status', intent: 'quotations' },
  { text: 'pending quotations', intent: 'quotations' },
  { text: 'quotation dikhao', intent: 'quotations' },

  // ─── COPQ (Cost of Poor Quality) ───
  { text: 'copq', intent: 'copq' },
  { text: 'cost of poor quality', intent: 'copq' },
  { text: 'quality cost', intent: 'copq' },
  { text: 'copq report', intent: 'copq' },
  { text: 'rejection cost', intent: 'copq' },
  { text: 'poor quality cost', intent: 'copq' },

  // ─── Training Records ───
  { text: 'training', intent: 'training' },
  { text: 'training records', intent: 'training' },
  { text: 'training list', intent: 'training' },
  { text: 'pending training', intent: 'training' },
  { text: 'training status', intent: 'training' },
  { text: 'employee training', intent: 'training' },
  { text: 'training dikhao', intent: 'training' },

  // ─── Transporters ───
  { text: 'transporters', intent: 'transporters' },
  { text: 'transporter list', intent: 'transporters' },
  { text: 'logistics partners', intent: 'transporters' },
  { text: 'transport companies', intent: 'transporters' },
  { text: 'transporter dikhao', intent: 'transporters' },

  // ─── Downtime ───
  { text: 'downtime', intent: 'downtime' },
  { text: 'machine downtime', intent: 'downtime' },
  { text: 'downtime reasons', intent: 'downtime' },
  { text: 'downtime report', intent: 'downtime' },
  { text: 'breakdown', intent: 'downtime' },
  { text: 'machine breakdown', intent: 'downtime' },
  { text: 'downtime dikhao', intent: 'downtime' },

  // ─── Help / About ───
  { text: 'help', intent: 'help' },
  { text: 'help me', intent: 'help' },
  { text: 'madad karo', intent: 'help' },
  { text: 'sahayata', intent: 'help' },
  { text: 'kya kar sakte ho', intent: 'help' },
  { text: 'what can you do', intent: 'help' },
  { text: 'what do you do', intent: 'help' },
  { text: 'tum kya karte ho', intent: 'help' },
  { text: 'aap kya kar sakte ho', intent: 'help' },
  { text: 'features list', intent: 'help' },
  { text: 'kya kya bata sakte ho', intent: 'help' },
  { text: 'commands', intent: 'help' },
  { text: 'menu', intent: 'help' },
  { text: 'options', intent: 'help' },
  { text: 'kya pooch sakta hoon', intent: 'help' },

  // ─── About ───
  { text: 'about', intent: 'about' },
  { text: 'what is dynatech', intent: 'about' },
  { text: 'dynatech kya hai', intent: 'about' },
  { text: 'about this app', intent: 'about' },
  { text: 'ye application kya hai', intent: 'about' },

  // ─── Users: name listing (vs count summary) ───
  { text: 'name all employees', intent: 'users' },
  { text: 'list all employees', intent: 'users' },
  { text: 'employee names', intent: 'users' },
  { text: 'sabhi employees ke naam', intent: 'users' },
  { text: 'show employee list with names', intent: 'users' },
  { text: 'all employee names', intent: 'users' },
  { text: 'employee list dikhao', intent: 'users' },
  { text: 'naam dikhao sabhi ke', intent: 'users' },
  { text: 'sab employees ke naam bata', intent: 'users' },
  { text: 'what are the names of employees', intent: 'users' },
  { text: 'employees ka naam kya hai', intent: 'users' },
  { text: 'har department ke employees', intent: 'department_users' },
  { text: 'from all departments show employees', intent: 'department_users' },
  { text: 'all departments employees', intent: 'department_users' },
  { text: 'name all the employees', intent: 'users' },
  { text: 'what are their names', intent: 'users' },
  { text: 'inke naam bata', intent: 'users' },
  { text: 'names dikhao', intent: 'users' },

  // ─── Maintenance: Breakdowns ───
  { text: 'breakdown requests dikhao', intent: 'maintenance_breakdowns' },
  { text: 'machine kharab hain', intent: 'maintenance_breakdowns' },
  { text: 'open breakdowns', intent: 'maintenance_breakdowns' },
  { text: 'breakdown report', intent: 'maintenance_breakdowns' },
  { text: 'breakdown status', intent: 'maintenance_breakdowns' },
  { text: 'kitni machines kharab hain', intent: 'maintenance_breakdowns' },
  { text: 'show breakdown requests', intent: 'maintenance_breakdowns' },
  { text: 'pending breakdowns', intent: 'maintenance_breakdowns' },
  { text: 'machine failure report', intent: 'maintenance_breakdowns' },
  { text: 'breakdown count', intent: 'maintenance_breakdowns' },
  { text: 'kaunsi machine band hai', intent: 'maintenance_breakdowns' },
  { text: 'machine ne kab breakdown lia', intent: 'maintenance_breakdowns' },

  // ─── Maintenance: Work Orders ───
  { text: 'maintenance work orders', intent: 'maintenance_work_orders' },
  { text: 'corrective work orders', intent: 'maintenance_work_orders' },
  { text: 'maintenance wo list', intent: 'maintenance_work_orders' },
  { text: 'mwo status', intent: 'maintenance_work_orders' },
  { text: 'open maintenance orders', intent: 'maintenance_work_orders' },
  { text: 'maintenance order dikhao', intent: 'maintenance_work_orders' },
  { text: 'repair work orders', intent: 'maintenance_work_orders' },
  { text: 'maintenance wo dikhao', intent: 'maintenance_work_orders' },
  { text: 'kitne maintenance work orders hain', intent: 'maintenance_work_orders' },

  // ─── Maintenance: PM Work Orders ───
  { text: 'pm work orders', intent: 'pm_work_orders' },
  { text: 'preventive maintenance orders', intent: 'pm_work_orders' },
  { text: 'pm wo list', intent: 'pm_work_orders' },
  { text: 'pm order status', intent: 'pm_work_orders' },
  { text: 'completed pm orders', intent: 'pm_work_orders' },
  { text: 'pm compliance', intent: 'pm_work_orders' },
  { text: 'pm wo dikhao', intent: 'pm_work_orders' },
  { text: 'pm kitni ho gayi', intent: 'pm_work_orders' },

  // ─── Maintenance: PM Schedules ───
  { text: 'pm schedules', intent: 'pm_schedules' },
  { text: 'preventive maintenance schedule', intent: 'pm_schedules' },
  { text: 'overdue pm', intent: 'pm_schedules' },
  { text: 'upcoming preventive maintenance', intent: 'pm_schedules' },
  { text: 'pm due this week', intent: 'pm_schedules' },
  { text: 'pm schedule dikhao', intent: 'pm_schedules' },
  { text: 'maintenance scheduled', intent: 'pm_schedules' },
  { text: 'pm calendar', intent: 'pm_schedules' },
  { text: 'pm overdue hai kya', intent: 'pm_schedules' },

  // ─── Maintenance: LOTO Permits ───
  { text: 'loto permits', intent: 'loto_permits' },
  { text: 'lockout tagout', intent: 'loto_permits' },
  { text: 'loto list', intent: 'loto_permits' },
  { text: 'active loto permits', intent: 'loto_permits' },
  { text: 'safety permits', intent: 'loto_permits' },
  { text: 'loto dikhao', intent: 'loto_permits' },
  { text: 'loto status', intent: 'loto_permits' },
  { text: 'loto active hai kya', intent: 'loto_permits' },

  // ─── Maintenance: Downtime Logs ───
  { text: 'downtime logs', intent: 'downtime_logs' },
  { text: 'machine downtime hours', intent: 'downtime_logs' },
  { text: 'total downtime', intent: 'downtime_logs' },
  { text: 'kitne ghante machine bandi', intent: 'downtime_logs' },
  { text: 'downtime entries', intent: 'downtime_logs' },
  { text: 'unplanned downtime', intent: 'downtime_logs' },
  { text: 'planned downtime', intent: 'downtime_logs' },
  { text: 'machine bandi kitni baar hui', intent: 'downtime_logs' },

  // ─── Maintenance: Costs ───
  { text: 'maintenance costs', intent: 'maintenance_costs' },
  { text: 'repair costs', intent: 'maintenance_costs' },
  { text: 'maintenance kharcha', intent: 'maintenance_costs' },
  { text: 'maintenance expense', intent: 'maintenance_costs' },
  { text: 'maintenance cost summary', intent: 'maintenance_costs' },
  { text: 'kitna kharcha hua maintenance mein', intent: 'maintenance_costs' },
  { text: 'maintenance budget', intent: 'maintenance_costs' },

  // ─── Maintenance: KPIs ───
  { text: 'maintenance kpis', intent: 'maintenance_kpis' },
  { text: 'mtbf', intent: 'maintenance_kpis' },
  { text: 'mttr', intent: 'maintenance_kpis' },
  { text: 'mean time between failures', intent: 'maintenance_kpis' },
  { text: 'mean time to repair', intent: 'maintenance_kpis' },
  { text: 'pm compliance rate', intent: 'maintenance_kpis' },
  { text: 'maintenance performance', intent: 'maintenance_kpis' },
  { text: 'maintenance metrics', intent: 'maintenance_kpis' },
  { text: 'maintenance dashboard', intent: 'maintenance_kpis' },
  { text: 'maintenance kpi kya hai', intent: 'maintenance_kpis' },

  // ─── Mold Management ───
  { text: 'mold list', intent: 'molds' },
  { text: 'molds dikhao', intent: 'molds' },
  { text: 'mold status', intent: 'molds' },
  { text: 'kitne molds hain', intent: 'molds' },
  { text: 'mold master', intent: 'molds' },
  { text: 'moulds summary', intent: 'molds' },
  { text: 'in production molds', intent: 'molds' },
  { text: 'mold inventory', intent: 'molds' },
  { text: 'mold kitne hain', intent: 'molds' },

  // ─── Mold Shot Count ───
  { text: 'mold shot count', intent: 'mold_shot_count' },
  { text: 'shots liye mold ne', intent: 'mold_shot_count' },
  { text: 'mold shots', intent: 'mold_shot_count' },
  { text: 'shot count summary', intent: 'mold_shot_count' },
  { text: 'mold life percentage', intent: 'mold_shot_count' },
  { text: 'mold ne kitne shots liye', intent: 'mold_shot_count' },

  // ─── Mold Life Alerts ───
  { text: 'mold life alerts', intent: 'mold_life_alerts' },
  { text: 'mold replacement needed', intent: 'mold_life_alerts' },
  { text: 'molds near end of life', intent: 'mold_life_alerts' },
  { text: 'mold alerts', intent: 'mold_life_alerts' },
  { text: 'mold eol', intent: 'mold_life_alerts' },
  { text: 'mold khatam ho raha hai', intent: 'mold_life_alerts' },

  // ─── Mold Issue / Return ───
  { text: 'mold issue return', intent: 'mold_issue_return' },
  { text: 'mold issued', intent: 'mold_issue_return' },
  { text: 'mold wapas', intent: 'mold_issue_return' },
  { text: 'mold transactions', intent: 'mold_issue_return' },
  { text: 'mold diya kisko', intent: 'mold_issue_return' },
  { text: 'mold return hua kya', intent: 'mold_issue_return' },

  // ─── Sites overview ───
  { text: 'site list', intent: 'sites' },
  { text: 'all sites', intent: 'sites' },
  { text: 'plant list', intent: 'sites' },
  { text: 'all plants', intent: 'sites' },
  { text: 'how many sites', intent: 'sites' },
  { text: 'manufacturing plants', intent: 'sites' },
  { text: 'company sites', intent: 'sites' },
  { text: 'active sites', intent: 'sites' },

  // ─── Site Config ───
  { text: 'machine scheduling', intent: 'site_config' },
  { text: 'production edit lock', intent: 'site_config' },
  { text: 'manual po approval', intent: 'site_config' },
  { text: 'is scheduling on', intent: 'site_config' },
  { text: 'edit lock window', intent: 'site_config' },
  { text: 'po approval setting', intent: 'site_config' },
  { text: 'planning config', intent: 'site_config' },

  // ─── Site Nomenclature ───
  { text: 'po prefix', intent: 'site_nomenclature' },
  { text: 'dispatch prefix', intent: 'site_nomenclature' },
  { text: 'po format', intent: 'site_nomenclature' },
  { text: 'document number format', intent: 'site_nomenclature' },
  { text: 'nomenclature', intent: 'site_nomenclature' },
  { text: 'po year format', intent: 'site_nomenclature' },
  { text: 'dispatch number format', intent: 'site_nomenclature' },

  // ─── Site Inventory Config ───
  { text: 'rack tracking', intent: 'site_inventory_config' },
  { text: 'bundle tracking', intent: 'site_inventory_config' },
  { text: 'mrn to issue setting', intent: 'site_inventory_config' },
  { text: 'alternate unit', intent: 'site_inventory_config' },
  { text: 'inventory tracking config', intent: 'site_inventory_config' },
  { text: 'site inventory settings', intent: 'site_inventory_config' },

  // ─── Site Costing Config ───
  { text: 'costing', intent: 'site_costing_config' },
  { text: 'costing enabled', intent: 'site_costing_config' },
  { text: 'costing calculation', intent: 'site_costing_config' },
  { text: 'overhead calculation', intent: 'site_costing_config' },
  { text: 'site costing', intent: 'site_costing_config' },
  { text: 'is costing on', intent: 'site_costing_config' },
  { text: 'costing setting', intent: 'site_costing_config' },
  { text: 'cost calculation enabled', intent: 'site_costing_config' },

  // ─── Site Maintenance Config ───
  { text: 'downtime template', intent: 'site_maintenance_config' },
  { text: 'downtime format', intent: 'site_maintenance_config' },
  { text: 'downtime entry format', intent: 'site_maintenance_config' },
  { text: 'downtime config', intent: 'site_maintenance_config' },
  { text: 'maintenance template setting', intent: 'site_maintenance_config' },

  // ─── Site Contact ───
  { text: 'site gstin', intent: 'site_contact' },
  { text: 'gstin number', intent: 'site_contact' },
  { text: 'site email', intent: 'site_contact' },
  { text: 'invoice address', intent: 'site_contact' },
  { text: 'shipping address', intent: 'site_contact' },
  { text: 'site contact details', intent: 'site_contact' },
  { text: 'plant address', intent: 'site_contact' },

  // ─── Site Employees ───
  { text: 'site employees', intent: 'site_employees' },
  { text: 'who works at site', intent: 'site_employees' },
  { text: 'staff at plant', intent: 'site_employees' },
  { text: 'site assignment', intent: 'site_employees' },
  { text: 'plant wise employees', intent: 'site_employees' },
  { text: 'site wise employees', intent: 'site_employees' },

  // ─── Shifts ───
  { text: 'shift timing', intent: 'shifts' },
  { text: 'shift list', intent: 'shifts' },
  { text: 'all shifts', intent: 'shifts' },
  { text: 'working hours', intent: 'shifts' },
  { text: 'day shift timing', intent: 'shifts' },
  { text: 'night shift timing', intent: 'shifts' },
  { text: 'lunch break', intent: 'shifts' },
  { text: 'shift hours', intent: 'shifts' },

  // ─── Warehouses ───
  { text: 'warehouse list', intent: 'warehouses' },
  { text: 'all warehouses', intent: 'warehouses' },
  { text: 'godown list', intent: 'warehouses' },
  { text: 'storage locations', intent: 'warehouses' },
  { text: 'raw material store', intent: 'warehouses' },
  { text: 'warehouse details', intent: 'warehouses' },

  // ─── Warehouse Config ───
  { text: 'warehouse config', intent: 'warehouse_config' },
  { text: 'warehouse settings', intent: 'warehouse_config' },
  { text: 'year basis', intent: 'warehouse_config' },
  { text: 'warehouse grn prefix', intent: 'warehouse_config' },
  { text: 'warehouse configuration', intent: 'warehouse_config' },
  { text: 'financial year basis', intent: 'warehouse_config' },

  // ─── Integrations ───
  { text: 'integration list', intent: 'integrations' },
  { text: 'tally integration', intent: 'integrations' },
  { text: 'zoho integration', intent: 'integrations' },
  { text: 'sap integration', intent: 'integrations' },
  { text: 'integration status', intent: 'integrations' },
  { text: 'is tally connected', intent: 'integrations' },
  { text: 'zoho connected', intent: 'integrations' },
  { text: 'third party integration', intent: 'integrations' },

  // ─── Equipment Master ───
  { text: 'equipment master', intent: 'equipment' },
  { text: 'equipment list', intent: 'equipment' },
  { text: 'all equipment', intent: 'equipment' },
  { text: 'equipment status', intent: 'equipment' },
  { text: 'critical equipment', intent: 'equipment' },
  { text: 'equipment health', intent: 'equipment' },
  { text: 'equipment code', intent: 'equipment' },
  { text: 'plant equipment', intent: 'equipment' },
  { text: 'equipment hierarchy', intent: 'equipment' },

  // ─── Maintenance Health ───
  { text: 'health dashboard', intent: 'maintenance_health' },
  { text: 'equipment health score', intent: 'maintenance_health' },
  { text: 'machine health score', intent: 'maintenance_health' },
  { text: 'health status', intent: 'maintenance_health' },
  { text: 'maintenance health', intent: 'maintenance_health' },
  { text: 'asset health', intent: 'maintenance_health' },

  // ─── Spare Parts ───
  { text: 'spare parts', intent: 'spare_parts' },
  { text: 'spare part list', intent: 'spare_parts' },
  { text: 'spare part stock', intent: 'spare_parts' },
  { text: 'low stock spare', intent: 'spare_parts' },
  { text: 'replacement parts', intent: 'spare_parts' },
  { text: 'spare part inventory', intent: 'spare_parts' },

  // ─── Mold new pages ───
  { text: 'mold cavity tracking', intent: 'mold_cavities' },
  { text: 'cavity status', intent: 'mold_cavities' },
  { text: 'mold store', intent: 'mold_store' },
  { text: 'mold storage location', intent: 'mold_store' },
  { text: 'mold pm schedule', intent: 'mold_pm' },
  { text: 'mold maintenance due', intent: 'mold_pm' },
  { text: 'mold repair request', intent: 'mold_repair' },
  { text: 'damaged mold', intent: 'mold_repair' },
  { text: 'mold trial', intent: 'mold_trials' },
  { text: 'trial result mold', intent: 'mold_trials' },
  { text: 'mold cost tracking', intent: 'mold_cost' },
  { text: 'mold investment', intent: 'mold_cost' },
  { text: 'mold documents', intent: 'mold_documents' },
  { text: 'mold specification', intent: 'mold_documents' },
];

// Train classifier
TRAINING_DATA.forEach((d) => classifier.addDocument(d.text, d.intent));
classifier.train();

// ── Department Entity Extraction ────────────────────────────────────────────
const DEPT_ALIASES = [
  { keywords: ['hr', 'human resource', 'admin'],                        search: '%HR%' },
  { keywords: ['quality', 'qa'],                                        search: '%Quality%' },
  { keywords: ['production', 'manufacturing', 'factory'],               search: '%Production%' },
  { keywords: ['procurement', 'purchase', 'buying'],                    search: '%Procurement%' },
  { keywords: ['store', 'warehouse', 'godown'],                         search: '%Store%' },
  { keywords: ['dispatch', 'logistics', 'shipping'],                    search: '%Dispatch%' },
  { keywords: ['accounts', 'finance', 'billing', 'tally'],             search: '%Accounts%' },
  { keywords: ['management', 'plant head', 'plant_head', 'director'],  search: '%Management%' },
];

function extractDepartment(input) {
  for (const alias of DEPT_ALIASES) {
    for (const kw of alias.keywords) {
      if (input.includes(kw)) return alias;
    }
  }
  return null;
}

// ── Static Responses ────────────────────────────────────────────────────────
const STATIC_RESPONSES = {
  greeting: [
    'Namaste! Main Madad hoon. Aapki kya help kar sakta hoon?',
    'Hello! Madad yahaan hai. Kya poochna hai?',
    'Hey! Kaise madad kar sakta hoon aapki?',
    'Namaste! Bataiye, kya jaanna chahte hain?',
  ],
  goodbye: [
    'Alvida! Koi zaroorat ho toh zaroor poochho.',
    'Bye! Madad hamesha yahaan hai.',
    'Phir milenge! Factory mein koi sawal ho toh aa jaana.',
  ],
  thanks: [
    'Koi baat nahi! Aur kuch help chahiye?',
    'Shukriya! Aur poochho agar kuch aur chahiye.',
    'Welcome! Main hamesha yahaan hoon.',
  ],
  help: [
    `Main Madad hoon — Dynatech One ka assistant. Ye sab pooch sakte ho:

**👥 People & Setup:**
- **Roles** / **Departments** / **Users** / **"HR team"** / **"find employee Rajesh"**

**📦 Supply Chain:**
- **Customer Orders** / **Purchase Orders** / **GRN** / **Vendors** / **Items**
- **Material Requests** / **Issue Slips** / **Inventory** / **Stock Adjustments**

**�icing Production:**
- **Work Orders** / **Job Cards** / **Machines** / **Scrap Vouchers**
- **Jobwork Challans** / **Downtime**

**✅ Quality:**
- **IQC** / **LQC** / **PQC** / **OQC** inspections
- **Complaints** / **NCRs** / **CAPAs** / **SCARs**
- **Instruments & Calibration** / **COPQ**

**📐 NPD:**
- **Drawings** / **PFMEA** / **BOMs**

**📊 Dispatch & Finance:**
- **Dispatch Orders** / **Delivery Challans** / **Transporters**
- **Sales Invoices** / **Payments** / **Debit/Credit Notes**
- **RFQs** / **Quotations**

**📚 HR:**
- **Training Records**

**🔧 Maintenance:**
- **Breakdowns** / **Maintenance Work Orders** / **PM Work Orders**
- **PM Schedules** / **LOTO Permits** / **Downtime Logs**
- **Maintenance Costs** / **Maintenance KPIs (MTBF, MTTR)**

**🔩 Mold Management:**
- **Molds** / **Shot Count** / **Life Alerts** / **Issue & Return**

**📅 Date Filters:** Kisi bhi response ke baad bolein "aaj ka", "is hafte", "is mahine"
**🔁 Follow-up:** "aur dikhao" for more results | "phir se dikhao" to repeat

Hindi, English ya Hinglish mein poochho!`,
  ],
  about: [
    `**Dynatech One** — "Operations 'N' Everything"

Ye ek factory operations platform hai jo automotive manufacturing ke liye bana hai.

**Full lifecycle cover karta hai:**
Customer PO → Planning → Procurement → IQC → Store → Production → PQC → OQC → Dispatch

**Key features:**
- 8 Departments | 33 Modules | 81 Features
- IATF 16949 compliant quality system
- IQC, LQC, PQC, OQC inspections
- Complaint → NCR → CAPA auto-chain
- AI-powered suggestions (Madad)

Koi specific module ke baare mein jaanna ho toh poochho!`,
  ],
  unknown: [
    'Samajh nahi aaya. Thoda aur detail mein bataoge? Ya "help" likhke dekho ki main kya-kya bata sakta hoon.',
    'Ye sawal mere scope mein nahi hai abhi. "help" type karo toh bata doon ki kya-kya pooch sakte ho.',
    'Maaf karna, ye samajh nahi aaya. Kya aap roles, departments, items, ya complaints ke baare mein poochna chahte ho?',
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Data Fetcher Functions ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Helpers ──
function statusBreakdown(rows) {
  return rows.map((s) => `- ${s.status || 'N/A'}: **${s.count}**`).join('\n') || '- Koi data nahi hai abhi';
}

async function countByStatus(model, modelName) {
  return model.findAll({
    attributes: ['status', [model.sequelize.fn('COUNT', model.sequelize.col(`${modelName}.id`)), 'count']],
    group: ['status'],
    raw: true,
  });
}

// ── People & Setup ──

async function fetchRoles(models) {
  const roles = await models.Role.findAll({
    include: [{ model: models.Department, attributes: ['name'] }],
    order: [['department_id', 'ASC'], ['id', 'ASC']],
    raw: true, nest: true,
  });
  if (!roles.length) return 'Abhi koi role set nahi hai system mein.';
  const lines = roles.map((r) => `- **${r.label}** (${r.name}) — Dept: ${r.Department?.name || 'N/A'}`);
  return `**Total ${roles.length} Roles:**\n${lines.join('\n')}`;
}

async function fetchDepartments(models) {
  const depts = await models.Department.findAll({ order: [['code', 'ASC']], raw: true });
  if (!depts.length) return 'Abhi koi department set nahi hai.';
  const lines = depts.map((d) => `- **Dept ${d.code}:** ${d.name}`);
  return `**Total ${depts.length} Departments:**\n${lines.join('\n')}`;
}

async function fetchUsers(models, options = {}) {
  const { offset = 0 } = options;
  const totalUsers  = await models.User.count();
  const activeUsers = await models.User.count({ where: { is_active: true } });

  // Fetch actual employees with department, paginated
  const users = await models.User.findAll({
    where: { is_active: true },
    attributes: ['name', 'employee_id', 'email', 'phone'],
    include: [
      { model: models.Department, attributes: ['name'] },
      { model: models.Role,       attributes: ['label'] },
    ],
    order: [
      [models.Department, 'name', 'ASC'],
      ['name', 'ASC'],
    ],
    limit: 20, offset,
    raw: true, nest: true,
  });

  // Group by department
  const deptMap = {};
  for (const u of users) {
    const dept = u.Department?.name || 'Unassigned';
    if (!deptMap[dept]) deptMap[dept] = [];
    const label = u.employee_id ? ` (${u.employee_id})` : '';
    const role  = u.Role?.label  ? ` — ${u.Role.label}` : '';
    deptMap[dept].push(`  - **${u.name}**${label}${role}`);
  }

  const deptLines = Object.entries(deptMap)
    .map(([dept, names]) => `**${dept}:**\n${names.join('\n')}`);

  const remaining = activeUsers - offset - users.length;
  const moreHint  = remaining > 0 ? `\n_Aur **${remaining}** employees hain. "aur dikhao" bolein._` : '';

  return `**All Employees — ${activeUsers} Active (${offset + 1}–${offset + users.length} of ${activeUsers}):**

${deptLines.join('\n\n')}${moreHint}`;
}

// Phrases that mean "show all departments / everyone"
const ALL_DEPT_PATTERNS = [
  'all department', 'all employees', 'all users', 'from all', 'sab department',
  'har department', 'sab log', 'everyone', 'sabhi', 'all staff', 'all members',
  'each department', 'every department', 'har vibhag', 'full list', 'complete list',
];

async function fetchDepartmentUsers(models, input) {
  // Check if user wants everyone (all departments)
  const wantsAll = ALL_DEPT_PATTERNS.some((p) => input.includes(p));
  if (wantsAll) {
    return fetchUsers(models, {});  // reuse fetchUsers which now shows names by dept
  }

  const deptAlias = extractDepartment(input);
  if (!deptAlias) {
    // No specific dept AND not asking for all → helpful prompt
    return `Konsa department ke employees chahiye?\nTry karo: "HR team", "quality employees", "production team", "store team"\nYa sabhi ke liye: "name all employees" / "all departments"`;
  }

  const dept = await models.Department.findOne({ where: { name: { [Op.iLike]: deptAlias.search } }, raw: true });
  if (!dept) return `"${deptAlias.search.replace(/%/g, '')}" department nahi mila. "departments" type karo full list ke liye.`;

  const users = await models.User.findAll({
    where: { department_id: dept.id, is_active: true },
    include: [{ model: models.Role, attributes: ['label'] }],
    attributes: ['name', 'email', 'phone', 'employee_id'],
    order: [['name', 'ASC']], raw: true, nest: true,
  });
  if (!users.length) return `**${dept.name}** mein koi active employee nahi hai abhi.`;
  const lines = users.map((u) => {
    const parts = [`**${u.name}**`];
    if (u.employee_id) parts.push(`(${u.employee_id})`);
    if (u.Role?.label)  parts.push(`— ${u.Role.label}`);
    if (u.email)        parts.push(`| ${u.email}`);
    if (u.phone)        parts.push(`| ${u.phone}`);
    return `- ${parts.join(' ')}`;
  });
  return `**${dept.name} — ${users.length} Employee(s):**\n${lines.join('\n')}`;
}

async function fetchEmployeeLookup(models, input) {
  const fillers = ['find', 'search', 'show', 'details', 'detail', 'info', 'information',
                   'of', 'for', 'about', 'give', 'get', 'me', 'all', 'list', 'please', 'kindly',
                   'contact', 'profile', 'summary', 'share', 'provide', 'fetch',
                   'employee', 'user', 'staff', 'ka', 'ke', 'ki', 'kaun', 'hai', 'ye', 'the',
                   'dikhao', 'batao', 'do', 'bata', 'chahiye', 'lookup'];
  const words = input.split(/\s+/).filter((w) => !fillers.includes(w) && w.length > 1);
  const searchName = words.join(' ').trim();
  if (!searchName || searchName.length < 2) return 'Employee ka naam bataoge toh details nikal doon. Jaise: "find employee Rajesh"';
  const users = await models.User.findAll({
    where: { [Op.or]: [{ name: { [Op.iLike]: `%${searchName}%` } }, { employee_id: { [Op.iLike]: `%${searchName}%` } }, { email: { [Op.iLike]: `%${searchName}%` } }] },
    include: [{ model: models.Role, attributes: ['label'] }, { model: models.Department, attributes: ['name'] }],
    attributes: ['name', 'email', 'phone', 'employee_id', 'is_active'],
    limit: 10, raw: true, nest: true,
  });
  if (!users.length) return `"${searchName}" se koi employee nahi mila. Naam ya ID check karo.`;
  const lines = users.map((u) => `- **${u.name}** (${u.employee_id}) — ${u.Role?.label || 'N/A'} | ${u.Department?.name || 'N/A'} | ${u.email || 'No email'} | ${u.phone || 'No phone'} | ${u.is_active ? 'Active' : 'Inactive'}`);
  return `**Search Results for "${searchName}":**\n${lines.join('\n')}`;
}

// ── Masters ──

async function fetchItems(models) {
  const totalItems = await models.Item.count();
  const activeItems = await models.Item.count({ where: { is_active: true } });
  const byType = await models.Item.findAll({
    attributes: ['item_type', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
    group: ['item_type'], raw: true,
  });
  const TYPE_LABELS = { RM: 'Raw Material', SFG: 'Semi-Finished', FG: 'Finished Goods', WIP: 'Work In Progress', MRO: 'MRO', PKG: 'Packaging', SVC: 'Service' };
  const typeLines = byType.map((t) => `- ${TYPE_LABELS[t.item_type] || t.item_type || 'Unspecified'}: ${t.count}`);
  return `**Items Summary:**\n- Total: **${totalItems}** | Active: **${activeItems}**\n\n**Type-wise:**\n${typeLines.join('\n')}`;
}

async function fetchMachines(models) {
  const totalMachines = await models.Machine.count();
  const activeMachines = await models.Machine.count({ where: { is_active: true } });
  const machines = await models.Machine.findAll({
    where: { is_active: true }, attributes: ['name', 'code'],
    order: [['name', 'ASC']], limit: 15, raw: true,
  });
  const lines = machines.map((m) => `- ${m.name} (${m.code})`);
  const more = activeMachines > 15 ? `\n...aur ${activeMachines - 15} machines` : '';
  return `**Machines Summary:**\n- Total: **${totalMachines}** | Active: **${activeMachines}**\n\n**Active Machines:**\n${lines.join('\n')}${more}`;
}

async function fetchVendors(models) {
  const totalVendors = await models.Vendor.count({ where: { type: 'vendor' } });
  const totalCustomers = await models.Vendor.count({ where: { type: 'customer' } });
  const totalJobwork = await models.Vendor.count({ where: { type: 'jobwork_vendor' } });
  const activeVendors = await models.Vendor.count({ where: { type: 'vendor', is_active: true } });

  const recentVendors = await models.Vendor.findAll({
    where: { type: 'vendor', is_active: true },
    attributes: ['name', 'partner_code', 'mobile'],
    order: [['createdAt', 'DESC']], limit: 5, raw: true,
  });
  const vendorLines = recentVendors.map((v) => `- ${v.name} (${v.partner_code}) ${v.mobile || ''}`);

  return `**Partners Summary:**
- Vendors: **${totalVendors}** (Active: ${activeVendors})
- Customers: **${totalCustomers}**
- Jobwork Vendors: **${totalJobwork}**
- Total: **${totalVendors + totalCustomers + totalJobwork}**

**Recent Vendors:**
${vendorLines.join('\n') || '- Koi vendor nahi hai'}`;
}

async function fetchCustomers(models) {
  const total = await models.Vendor.count({ where: { type: 'customer' } });
  const active = await models.Vendor.count({ where: { type: 'customer', is_active: true } });

  const customers = await models.Vendor.findAll({
    where: { type: 'customer', is_active: true },
    attributes: ['name', 'partner_code', 'email', 'mobile'],
    order: [['name', 'ASC']], limit: 20, raw: true,
  });

  const lines = customers.map((c) => `- **${c.name}** (${c.partner_code}) | ${c.email || 'No email'} | ${c.mobile || 'No phone'}`);
  const more = active > 20 ? `\n...aur ${active - 20} customers` : '';

  return `**Customers:**
- Total: **${total}** | Active: **${active}**

**Customer List:**
${lines.join('\n') || '- Koi customer nahi hai'}${more}`;
}

async function fetchTransporters(models) {
  const total = await models.Transporter.count();
  const active = await models.Transporter.count({ where: { is_active: true } });
  const list = await models.Transporter.findAll({
    where: { is_active: true },
    attributes: ['transporter_name', 'contact_person', 'phone'],
    order: [['transporter_name', 'ASC']], limit: 10, raw: true,
  });
  const lines = list.map((t) => `- **${t.transporter_name}** — ${t.contact_person || 'N/A'} | ${t.phone || 'N/A'}`);
  return `**Transporters:**\n- Total: **${total}** | Active: **${active}**\n\n${lines.join('\n') || '- Koi transporter nahi hai'}`;
}

// ── Sites & Warehouses ──

async function fetchSites(models) {
  const total    = await models.Site.count();
  const active   = await models.Site.count({ where: { is_active: true } });
  const inactive = total - active;

  const sites = await models.Site.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code', 'email', 'gstin'],
    include:    [{ model: models.Warehouse, attributes: ['id'] }],
    order:      [['name', 'ASC']],
  });

  const lines = sites.map((s) => {
    const wCount = s.Warehouses?.length ?? 0;
    const parts  = [`- **${s.name}** (${s.code})`];
    if (s.gstin)  parts.push(`GSTIN: ${s.gstin}`);
    if (wCount)   parts.push(`${wCount} warehouse${wCount > 1 ? 's' : ''}`);
    return parts.join(' | ');
  });

  return `**Sites / Plants Summary:**
- Total: **${total}** | Active: **${active}** | Inactive: **${inactive}**

**Active Sites:**
${lines.join('\n') || '- Koi active site nahi hai'}`;
}

async function fetchWarehouses(models) {
  const total    = await models.Warehouse.count();
  const active   = await models.Warehouse.count({ where: { is_active: true } });
  const inactive = total - active;

  const warehouses = await models.Warehouse.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code'],
    include:    [{ model: models.Site, attributes: ['name'] }],
    order:      [['name', 'ASC']],
    limit:      20,
  });

  const lines = warehouses.map((w) => `- **${w.name}** (${w.code}) — ${w.Site?.name || 'N/A'}`);
  const more  = active > 20 ? `\n...aur ${active - 20} aur warehouses` : '';

  return `**Warehouses Summary:**
- Total: **${total}** | Active: **${active}** | Inactive: **${inactive}**

**Active Warehouses:**
${lines.join('\n') || '- Koi warehouse nahi hai'}${more}`;
}

// ── Site sub-section handlers ──────────────────────────────────────────────
// Each handler covers one logical "section" from the Site configuration UI.

// Section: Production & Planning Config
// Covers: machine_scheduling, production_edit_lock_window, manual_po_approval
async function fetchSiteConfig(models) {
  const sites = await models.Site.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code', 'machine_scheduling', 'production_edit_lock_window', 'manual_po_approval'],
    order:      [['name', 'ASC']],
  });
  if (!sites.length) return 'Koi active site nahi hai.';

  const flag = (v) => v ? '✓ On' : '✗ Off';
  const lockLabel = (v) => v === 'never' ? 'No lock' : `Locked after ${v}`;

  const lines = sites.map((s) =>
    `**${s.name}** (${s.code})\n` +
    `  - Machine Scheduling: ${flag(s.machine_scheduling)}\n` +
    `  - Edit Lock Window: ${lockLabel(s.production_edit_lock_window)}\n` +
    `  - PO Approval: ${s.manual_po_approval ? '✓ Manual approval required' : '✗ Auto-approve'}`
  );

  return `**Production & Planning Config:**\n\n${lines.join('\n\n')}`;
}

// Section: Nomenclature (document number formats)
// Covers: po_prefix, po_year_format, po_separator, dispatch_prefix, dispatch_year_format, dispatch_separator
async function fetchSiteNomenclature(models) {
  const sites = await models.Site.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code',
                 'po_prefix', 'po_year_format', 'po_separator',
                 'dispatch_prefix', 'dispatch_year_format', 'dispatch_separator'],
    order:      [['name', 'ASC']],
  });
  if (!sites.length) return 'Koi active site nahi hai.';

  const fmtSeries = (prefix, year, sep) => {
    const parts = [prefix, year].filter(Boolean);
    return parts.length ? parts.join(sep || '-') + `${sep || '-'}XXX` : 'Not configured';
  };

  const lines = sites.map((s) =>
    `**${s.name}** (${s.code})\n` +
    `  - PO Format:       ${fmtSeries(s.po_prefix, s.po_year_format, s.po_separator)}\n` +
    `  - Dispatch Format: ${fmtSeries(s.dispatch_prefix, s.dispatch_year_format, s.dispatch_separator)}`
  );

  return `**Nomenclature / Document Number Format:**\n\n${lines.join('\n\n')}`;
}

// Section: Inventory & Tracking Config
// Covers: mrn_to_issue, rack_tracking, bundle_tracking, alternate_unit
async function fetchSiteInventoryConfig(models) {
  const sites = await models.Site.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code', 'mrn_to_issue', 'rack_tracking', 'bundle_tracking', 'alternate_unit'],
    order:      [['name', 'ASC']],
  });
  if (!sites.length) return 'Koi active site nahi hai.';

  const flag = (v) => v ? '✓ On' : '✗ Off';
  const lines = sites.map((s) =>
    `**${s.name}** (${s.code})\n` +
    `  - MRN → Issue:      ${flag(s.mrn_to_issue)}\n` +
    `  - Rack Tracking:    ${flag(s.rack_tracking)}\n` +
    `  - Bundle Tracking:  ${flag(s.bundle_tracking)}\n` +
    `  - Alternate Unit:   ${flag(s.alternate_unit)}`
  );

  return `**Inventory & Tracking Config:**\n\n${lines.join('\n\n')}`;
}

// Section: Costing & Financial Config
// Covers: costing_calculation
async function fetchSiteCostingConfig(models) {
  const sites = await models.Site.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code', 'costing_calculation'],
    order:      [['name', 'ASC']],
  });
  if (!sites.length) return 'Koi active site nahi hai.';

  const enabled  = sites.filter((s) => s.costing_calculation);
  const disabled = sites.filter((s) => !s.costing_calculation);
  const lines = sites.map((s) =>
    `- **${s.name}** (${s.code}): ${s.costing_calculation ? '✓ Costing enabled' : '✗ Costing disabled'}`
  );

  return `**Costing & Financial Config:**\n` +
    `- Sites with costing enabled: **${enabled.length}** | Disabled: **${disabled.length}**\n\n` +
    lines.join('\n');
}

// Section: Maintenance Config
// Covers: downtime_template
async function fetchSiteMaintenanceConfig(models) {
  const sites = await models.Site.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code', 'downtime_template'],
    order:      [['name', 'ASC']],
  });
  if (!sites.length) return 'Koi active site nahi hai.';

  const TEMPLATE_LABELS = {
    duration_instances: 'Duration + Instances',
    from_duration:      'Start Time + Duration',
    from_to_time:       'Start Time → End Time',
  };

  const lines = sites.map((s) => {
    const label = TEMPLATE_LABELS[s.downtime_template] || s.downtime_template || 'Default';
    return `- **${s.name}** (${s.code}): ${label}`;
  });

  return `**Maintenance / Downtime Config:**\n\nDowntime entry template per site:\n${lines.join('\n')}`;
}

// Section: Site Contact & Identity
// Covers: email, gstin, invoice_addresses, shipping_addresses
async function fetchSiteContact(models) {
  const sites = await models.Site.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code', 'email', 'gstin', 'invoice_addresses', 'shipping_addresses'],
    order:      [['name', 'ASC']],
  });
  if (!sites.length) return 'Koi active site nahi hai.';

  const fmtAddr = (addrs) => {
    if (!addrs?.length) return 'Not set';
    const a = addrs[0];
    return [a.line1, a.city, a.state, a.pincode].filter(Boolean).join(', ') || 'Not set';
  };

  const lines = sites.map((s) =>
    `**${s.name}** (${s.code})\n` +
    `  - Email:            ${s.email || 'N/A'}\n` +
    `  - GSTIN:            ${s.gstin || 'N/A'}\n` +
    `  - Invoice Address:  ${fmtAddr(s.invoice_addresses)}\n` +
    `  - Shipping Address: ${fmtAddr(s.shipping_addresses)}`
  );

  return `**Site Contact & Identity:**\n\n${lines.join('\n\n')}`;
}

// Section: Site Employees
// Covers: users assigned via user_sites junction table
async function fetchSiteEmployees(models) {
  const sites = await models.Site.findAll({
    where:   { is_active: true },
    attributes: ['name', 'code'],
    include: [{
      model:      models.User,
      attributes: ['name', 'employee_id'],
      through:    { attributes: [] },
      include:    [{ model: models.Department, attributes: ['name'] }],
    }],
    order: [['name', 'ASC']],
  });

  const total = sites.reduce((acc, s) => acc + (s.Users?.length || 0), 0);

  const siteLines = sites.map((s) => {
    const count = s.Users?.length || 0;
    if (!count) return `**${s.name}** (${s.code}) — No employees assigned`;
    const empList = s.Users.slice(0, 5)
      .map((u) => `    • ${u.name} (${u.employee_id || 'N/A'}) — ${u.Department?.name || 'N/A'}`)
      .join('\n');
    const more = count > 5 ? `\n    ...aur ${count - 5} aur employees` : '';
    return `**${s.name}** (${s.code}) — ${count} employee${count > 1 ? 's' : ''}\n${empList}${more}`;
  });

  return `**Site-wise Employees:**\n- Total assigned: **${total}**\n\n${siteLines.join('\n\n') || 'Koi assignment nahi hai'}`;
}

// Section: Shifts (global — not site-specific)
// Covers: name, start_time, end_time, lunch_break_duration
async function fetchShifts(models) {
  const total  = await models.Shift.count();
  const active = await models.Shift.count({ where: { is_active: true } });

  const shifts = await models.Shift.findAll({
    where:      { is_active: true },
    attributes: ['name', 'start_time', 'end_time', 'lunch_break_duration'],
    order:      [['start_time', 'ASC']],
  });

  const lines = shifts.map((s) => {
    const dur = s.lunch_break_duration ? ` | Break: **${s.lunch_break_duration} min**` : ' | No break';
    return `- **${s.name}**: ${s.start_time} → ${s.end_time}${dur}`;
  });

  return `**Shifts Summary:**\n- Total: **${total}** | Active: **${active}**\n\n**Active Shifts:**\n${lines.join('\n') || '- Koi shift nahi hai'}`;
}

// Section: Warehouse Configuration (detailed settings)
// Covers: mrn_to_issue, rack_tracking, bundle_tracking, costing_calculation, grn_prefix, year_basis
async function fetchWarehouseConfig(models) {
  const warehouses = await models.Warehouse.findAll({
    where:      { is_active: true },
    attributes: ['name', 'code', 'mrn_to_issue', 'rack_tracking',
                 'bundle_tracking', 'costing_calculation', 'grn_prefix', 'year_basis'],
    include:    [{ model: models.Site, attributes: ['name'] }],
    order:      [['name', 'ASC']],
    limit:      15,
  });
  if (!warehouses.length) return 'Koi active warehouse nahi hai.';

  const flag  = (v) => v ? '✓' : '✗';
  const lines = warehouses.map((w) =>
    `**${w.name}** (${w.code}) — ${w.Site?.name || 'N/A'}\n` +
    `  - MRN→Issue: ${flag(w.mrn_to_issue)} | Rack: ${flag(w.rack_tracking)} | Bundle: ${flag(w.bundle_tracking)} | Costing: ${flag(w.costing_calculation)}\n` +
    `  - GRN Prefix: ${w.grn_prefix || 'None'} | Year Basis: ${w.year_basis === 'financial_year' ? 'Financial Year' : 'Calendar Year'}`
  );

  return `**Warehouse Configuration:**\n\n${lines.join('\n\n')}`;
}

// Section: Integrations (Tally, Zoho, SAP)
// Covers: slug, label, is_enabled, last_tested_at, last_test_status
async function fetchIntegrations(models) {
  // Seed defaults if empty
  const DEFAULT_SLUGS = [
    { slug: 'zoho',  label: 'Zoho',  description: 'Zoho CRM & Books integration' },
    { slug: 'tally', label: 'Tally', description: 'Tally ERP integration for accounting' },
    { slug: 'sap',   label: 'SAP',   description: 'SAP ERP integration' },
  ];
  for (const d of DEFAULT_SLUGS) {
    await models.Integration.findOrCreate({
      where: { slug: d.slug },
      defaults: { ...d, is_enabled: false, config: {} },
    });
  }

  const integrations = await models.Integration.findAll({
    attributes: ['slug', 'label', 'is_enabled', 'last_tested_at', 'last_test_status'],
    order:      [['id', 'ASC']],
  });

  const enabled  = integrations.filter((i) => i.is_enabled);
  const lines = integrations.map((i) => {
    const status    = i.is_enabled ? '✓ Enabled' : '✗ Disabled';
    const testLine  = i.last_test_status
      ? ` | Last test: **${i.last_test_status}** (${i.last_tested_at ? new Date(i.last_tested_at).toLocaleDateString('en-IN') : 'N/A'})`
      : ' | Never tested';
    return `- **${i.label}** (${i.slug}): ${status}${testLine}`;
  });

  return `**Integrations Summary:**\n- Enabled: **${enabled.length}** / ${integrations.length}\n\n${lines.join('\n') || '- Koi integration configure nahi hai'}`;
}

// ── Orders / Sales ──

async function fetchCustomerOrders(models) {
  const total = await models.CustomerOrder.count();
  const byStatus = await countByStatus(models.CustomerOrder, 'CustomerOrder');
  const active = await models.CustomerOrder.count({ where: { status: { [Op.notIn]: ['closed', 'cancelled'] } } });

  const recent = await models.CustomerOrder.findAll({
    attributes: ['order_no', 'customer_po_no', 'status', 'total_amount', 'delivery_date'],
    include: [{ model: models.Vendor, as: 'Customer', attributes: ['name'] }],
    order: [['createdAt', 'DESC']], limit: 5, raw: true, nest: true,
  });
  const recentLines = recent.map((o) => `- **${o.order_no}** (${o.customer_po_no || 'N/A'}) — ${o.Customer?.name || 'N/A'} | ${o.status} | ₹${o.total_amount || 0}`);

  return `**Customer Orders:**
- Total: **${total}** | Active: **${active}**

**Status-wise:**
${statusBreakdown(byStatus)}

**Recent Orders:**
${recentLines.join('\n') || '- Koi order nahi hai'}`;
}

async function fetchRfqs(models) {
  const total = await models.Rfq.count();
  const byStatus = await countByStatus(models.Rfq, 'Rfq');
  return `**RFQs (Request for Quotation):**\n- Total: **${total}**\n\n**Status-wise:**\n${statusBreakdown(byStatus)}`;
}

async function fetchQuotations(models) {
  const total = await models.Quotation.count();
  const byStatus = await countByStatus(models.Quotation, 'Quotation');
  const totalAmount = await models.Quotation.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('total_amount')), 'total']],
    raw: true,
  });
  return `**Quotations:**\n- Total: **${total}**\n- Total Value: **₹${Math.round(totalAmount?.total || 0).toLocaleString()}**\n\n**Status-wise:**\n${statusBreakdown(byStatus)}`;
}

// ── Procurement ──

async function fetchPurchaseOrders(models) {
  const total = await models.PurchaseOrder.count();
  const byStatus = await countByStatus(models.PurchaseOrder, 'PurchaseOrder');
  const pending = await models.PurchaseOrder.count({ where: { status: { [Op.notIn]: ['received', 'cancelled'] } } });

  const recent = await models.PurchaseOrder.findAll({
    attributes: ['po_no', 'status', 'order_date', 'expected_date'],
    include: [{ model: models.Vendor, as: 'Vendor', attributes: ['name'] }],
    order: [['created_at', 'DESC']], limit: 5, raw: true, nest: true,
  });
  const recentLines = recent.map((p) => `- **${p.po_no}** — ${p.Vendor?.name || 'N/A'} | ${p.status} | Expected: ${p.expected_date || 'N/A'}`);

  return `**Purchase Orders:**
- Total: **${total}** | Pending: **${pending}**

**Status-wise:**
${statusBreakdown(byStatus)}

**Recent POs:**
${recentLines.join('\n') || '- Koi PO nahi hai'}`;
}

async function fetchScars(models) {
  const total = await models.Scar.count();
  const byStatus = await countByStatus(models.Scar, 'Scar');
  return `**SCARs (Supplier Corrective Action Reports):**\n- Total: **${total}**\n\n**Status-wise:**\n${statusBreakdown(byStatus)}`;
}

// ── Store / Warehouse ──

async function fetchGrns(models) {
  const total = await models.Grn.count();
  const byStatus = await countByStatus(models.Grn, 'Grn');
  const pending = await models.Grn.count({ where: { status: 'pending' } });

  const recent = await models.Grn.findAll({
    attributes: ['grn_no', 'status', 'received_date', 'po_reference'],
    include: [{ model: models.Vendor, as: 'Vendor', attributes: ['name'] }],
    order: [['createdAt', 'DESC']], limit: 5, raw: true, nest: true,
  });
  const recentLines = recent.map((g) => `- **${g.grn_no}** — ${g.Vendor?.name || 'N/A'} | ${g.status} | PO: ${g.po_reference || 'N/A'}`);

  return `**GRN (Goods Receipt Notes):**
- Total: **${total}** | Pending Approval: **${pending}**

**Status-wise:**
${statusBreakdown(byStatus)}

**Recent GRNs:**
${recentLines.join('\n') || '- Koi GRN nahi hai'}`;
}

async function fetchInventory(models) {
  const totalRecords = await models.Inventory.count();
  const totalQty = await models.Inventory.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('qty_on_hand')), 'total_qty']],
    raw: true,
  });
  const zeroStock = await models.Inventory.count({ where: { qty_on_hand: 0 } });

  return `**Inventory Summary:**
- Total Items Tracked: **${totalRecords}**
- Total Qty on Hand: **${Math.round(totalQty?.total_qty || 0).toLocaleString()}**
- Zero Stock Items: **${zeroStock}**`;
}

async function fetchMaterialRequests(models) {
  const total = await models.MaterialRequest.count();
  const byStatus = await countByStatus(models.MaterialRequest, 'MaterialRequest');
  const pending = await models.MaterialRequest.count({ where: { status: 'pending' } });

  return `**Material Requests:**
- Total: **${total}** | Pending: **${pending}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchIssueSlips(models) {
  const total = await models.IssueSlip.count();
  const byStatus = await countByStatus(models.IssueSlip, 'IssueSlip');

  return `**Issue Slips (Material Issuance):**
- Total: **${total}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchStockAdjustments(models) {
  const total = await models.StockAdjustment.count();
  const byStatus = await countByStatus(models.StockAdjustment, 'StockAdjustment');

  return `**Stock Adjustments:**
- Total: **${total}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

// ── Production ──

async function fetchWorkOrders(models) {
  const total = await models.WorkOrder.count();
  const byStatus = await countByStatus(models.WorkOrder, 'WorkOrder');
  const active = await models.WorkOrder.count({ where: { status: { [Op.notIn]: ['completed', 'cancelled', 'closed'] } } });

  const totalProduced = await models.WorkOrder.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('produced_qty')), 'qty']],
    raw: true,
  });
  const totalRejected = await models.WorkOrder.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('rejected_qty')), 'qty']],
    raw: true,
  });

  const recent = await models.WorkOrder.findAll({
    attributes: ['wo_no', 'status', 'planned_qty', 'produced_qty', 'rejected_qty'],
    include: [{ model: models.Item, as: 'Item', attributes: ['name'] }],
    order: [['created_at', 'DESC']], limit: 5, raw: true, nest: true,
  });
  const recentLines = recent.map((w) => `- **${w.wo_no}** — ${w.Item?.name || 'N/A'} | ${w.status} | Plan: ${w.planned_qty} | Done: ${w.produced_qty} | Rej: ${w.rejected_qty}`);

  return `**Work Orders:**
- Total: **${total}** | Active: **${active}**
- Total Produced: **${Math.round(totalProduced?.qty || 0).toLocaleString()}**
- Total Rejected: **${Math.round(totalRejected?.qty || 0).toLocaleString()}**

**Status-wise:**
${statusBreakdown(byStatus)}

**Recent Work Orders:**
${recentLines.join('\n') || '- Koi WO nahi hai'}`;
}

async function fetchJobCards(models) {
  const total = await models.JobCard.count();
  const byStatus = await countByStatus(models.JobCard, 'JobCard');

  return `**Job Cards:**
- Total: **${total}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchScrapVouchers(models) {
  const total = await models.ScrapVoucher.count();
  const byStatus = await countByStatus(models.ScrapVoucher, 'ScrapVoucher');
  const totalScrapped = await models.ScrapVoucher.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('quantity_scrapped')), 'qty']],
    raw: true,
  });

  return `**Scrap Vouchers:**
- Total: **${total}**
- Total Qty Scrapped: **${Math.round(totalScrapped?.qty || 0).toLocaleString()}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchDowntime(models) {
  const total = await models.DowntimeReason.count();
  const active = await models.DowntimeReason.count({ where: { is_active: true } });
  const reasons = await models.DowntimeReason.findAll({
    where: { is_active: true },
    attributes: ['reason_code', 'reason_desc', 'category'],
    order: [['category', 'ASC']], limit: 15, raw: true,
  });
  const lines = reasons.map((r) => `- **${r.reason_code}** — ${r.reason_desc} (${r.category || 'General'})`);

  return `**Downtime Reasons:**
- Total: **${total}** | Active: **${active}**

**Reason List:**
${lines.join('\n') || '- Koi downtime reason nahi hai'}`;
}

// ── Subcontracting / Jobwork ──

async function fetchSubcontractChallans(models) {
  const total = await models.SubcontractChallan.count();
  const byStatus = await countByStatus(models.SubcontractChallan, 'SubcontractChallan');
  const pending = await models.SubcontractChallan.count({ where: { status: { [Op.notIn]: ['returned', 'closed', 'cancelled'] } } });

  const recent = await models.SubcontractChallan.findAll({
    attributes: ['challan_no', 'status', 'challan_date', 'type'],
    include: [{ model: models.Vendor, as: 'Vendor', attributes: ['name'] }],
    order: [['created_at', 'DESC']], limit: 5, raw: true, nest: true,
  });
  const recentLines = recent.map((c) => `- **${c.challan_no}** — ${c.Vendor?.name || 'N/A'} | ${c.type} | ${c.status} | ${c.challan_date || 'N/A'}`);

  return `**Jobwork / Subcontract Challans:**
- Total: **${total}** | Pending Return: **${pending}**

**Status-wise:**
${statusBreakdown(byStatus)}

**Recent Challans:**
${recentLines.join('\n') || '- Koi challan nahi hai'}`;
}

// ── Dispatch / Delivery ──

async function fetchDispatchOrders(models) {
  const total = await models.DispatchOrder.count();
  const byStatus = await countByStatus(models.DispatchOrder, 'DispatchOrder');
  const pending = await models.DispatchOrder.count({ where: { status: { [Op.notIn]: ['delivered', 'cancelled'] } } });

  const recent = await models.DispatchOrder.findAll({
    attributes: ['dispatch_order_no', 'status', 'dispatch_date', 'expected_delivery_date'],
    include: [{ model: models.Vendor, as: 'Customer', attributes: ['name'] }],
    order: [['createdAt', 'DESC']], limit: 5, raw: true, nest: true,
  });
  const recentLines = recent.map((d) => `- **${d.dispatch_order_no}** — ${d.Customer?.name || 'N/A'} | ${d.status} | Delivery: ${d.expected_delivery_date || 'N/A'}`);

  return `**Dispatch Orders:**
- Total: **${total}** | Pending: **${pending}**

**Status-wise:**
${statusBreakdown(byStatus)}

**Recent Dispatches:**
${recentLines.join('\n') || '- Koi dispatch nahi hai'}`;
}

async function fetchDeliveryChallans(models) {
  const total = await models.DeliveryChallan.count();
  const byStatus = await countByStatus(models.DeliveryChallan, 'DeliveryChallan');

  return `**Delivery Challans:**
- Total: **${total}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

// ── Quality ──

async function fetchComplaints(models) {
  const total = await models.Complaint.count();
  const byStatus = await countByStatus(models.Complaint, 'Complaint');
  const open = await models.Complaint.count({ where: { status: { [Op.notIn]: ['closed', 'cancelled'] } } });

  return `**Customer Complaints:**
- Total: **${total}** | Open: **${open}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchNcrs(models) {
  const total = await models.Ncr.count();
  const byStatus = await countByStatus(models.Ncr, 'Ncr');
  const open = await models.Ncr.count({ where: { status: { [Op.notIn]: ['closed', 'cancelled'] } } });

  return `**Non-Conformance Reports (NCR):**
- Total: **${total}** | Open: **${open}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchCapas(models) {
  const total = await models.Capa.count();
  const byStatus = await countByStatus(models.Capa, 'Capa');
  const open = await models.Capa.count({ where: { status: { [Op.notIn]: ['closed', 'cancelled'] } } });

  const bySource = await models.Capa.findAll({
    attributes: ['source_type', [models.sequelize.fn('COUNT', models.sequelize.col('Capa.id')), 'count']],
    group: ['source_type'], raw: true,
  });
  const sourceLines = bySource.map((s) => `- ${s.source_type || 'N/A'}: **${s.count}**`);

  return `**CAPAs (Corrective & Preventive Actions):**
- Total: **${total}** | Open: **${open}**

**Status-wise:**
${statusBreakdown(byStatus)}

**Source-wise:**
${sourceLines.join('\n') || '- N/A'}`;
}

async function fetchIqcInspections(models) {
  const total = await models.IqcInspection.count();
  const byResult = await models.IqcInspection.findAll({
    attributes: ['result', [models.sequelize.fn('COUNT', models.sequelize.col('IqcInspection.id')), 'count']],
    group: ['result'], raw: true,
  });
  const resultLines = byResult.map((r) => `- ${r.result}: **${r.count}**`);
  const pending = await models.IqcInspection.count({ where: { result: 'pending' } });

  const totalQty = await models.IqcInspection.findOne({
    attributes: [
      [models.sequelize.fn('SUM', models.sequelize.col('qty_inspected')), 'inspected'],
      [models.sequelize.fn('SUM', models.sequelize.col('qty_rejected')), 'rejected'],
      [models.sequelize.fn('SUM', models.sequelize.col('qty_accepted')), 'accepted'],
    ],
    raw: true,
  });

  return `**IQC Inspections (Incoming Quality):**
- Total: **${total}** | Pending: **${pending}**
- Qty Inspected: **${Math.round(totalQty?.inspected || 0).toLocaleString()}**
- Qty Accepted: **${Math.round(totalQty?.accepted || 0).toLocaleString()}**
- Qty Rejected: **${Math.round(totalQty?.rejected || 0).toLocaleString()}**

**Result-wise:**
${resultLines.join('\n') || '- Koi IQC nahi hai'}`;
}

async function fetchLqcInspections(models) {
  const total = await models.LqcInspection.count();
  const byResult = await models.LqcInspection.findAll({
    attributes: ['result', [models.sequelize.fn('COUNT', models.sequelize.col('LqcInspection.id')), 'count']],
    group: ['result'], raw: true,
  });
  const resultLines = byResult.map((r) => `- ${r.result}: **${r.count}**`);

  return `**LQC Inspections (Line Quality):**
- Total: **${total}**

**Result-wise:**
${resultLines.join('\n') || '- Koi LQC nahi hai'}`;
}

async function fetchPqcInspections(models) {
  const total = await models.PqcInspection.count();
  const byResult = await models.PqcInspection.findAll({
    attributes: ['result', [models.sequelize.fn('COUNT', models.sequelize.col('PqcInspection.id')), 'count']],
    group: ['result'], raw: true,
  });
  const resultLines = byResult.map((r) => `- ${r.result}: **${r.count}**`);

  return `**PQC Inspections (Process/Packing Quality):**
- Total: **${total}**

**Result-wise:**
${resultLines.join('\n') || '- Koi PQC nahi hai'}`;
}

async function fetchOqcInspections(models) {
  const total = await models.OqcInspection.count();
  const byResult = await models.OqcInspection.findAll({
    attributes: ['result', [models.sequelize.fn('COUNT', models.sequelize.col('OqcInspection.id')), 'count']],
    group: ['result'], raw: true,
  });
  const resultLines = byResult.map((r) => `- ${r.result}: **${r.count}**`);

  return `**OQC Inspections (Outgoing Quality):**
- Total: **${total}**

**Result-wise:**
${resultLines.join('\n') || '- Koi OQC nahi hai'}`;
}

async function fetchInstruments(models) {
  const total = await models.Instrument.count();
  const byStatus = await models.Instrument.findAll({
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('Instrument.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);

  // Overdue calibration
  const overdue = await models.Instrument.count({
    where: { calibration_due_date: { [Op.lt]: new Date() } },
  });

  return `**Instruments & Calibration:**
- Total Instruments: **${total}**
- Calibration Overdue: **${overdue}**

**Status-wise:**
${statusLines.join('\n') || '- Koi instrument nahi hai'}`;
}

// ── NPD (New Product Development) ──

async function fetchDrawings(models) {
  const total = await models.Drawing.count();
  const byStatus = await models.Drawing.findAll({
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('Drawing.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);

  return `**Engineering Drawings:**
- Total: **${total}**

**Status-wise:**
${statusLines.join('\n') || '- Koi drawing nahi hai'}`;
}

async function fetchPfmeas(models) {
  const total = await models.Pfmea.count();
  const byStatus = await models.Pfmea.findAll({
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('Pfmea.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);

  // High RPN items
  const highRpn = await models.PfmeaItem.count({
    where: { rpn: { [Op.gte]: 100 } },
  });

  return `**PFMEA (Process Failure Mode Analysis):**
- Total PFMEAs: **${total}**
- High RPN Items (≥100): **${highRpn}**

**Status-wise:**
${statusLines.join('\n') || '- Koi PFMEA nahi hai'}`;
}

async function fetchBoms(models) {
  const total = await models.Bom.count();
  const byStatus = await countByStatus(models.Bom, 'Bom');

  return `**Bill of Materials (BOM):**
- Total: **${total}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

// ── Finance / Accounts ──

async function fetchSalesInvoices(models) {
  const total = await models.SalesInvoice.count();
  const byStatus = await countByStatus(models.SalesInvoice, 'SalesInvoice');
  const totalAmount = await models.SalesInvoice.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('total_amount')), 'total']],
    raw: true,
  });

  const tallySynced = await models.SalesInvoice.count({ where: { tally_sync_status: 'synced' } });
  const tallyPending = await models.SalesInvoice.count({ where: { tally_sync_status: { [Op.ne]: 'synced' } } });

  return `**Sales Invoices:**
- Total: **${total}**
- Total Value: **₹${Math.round(totalAmount?.total || 0).toLocaleString()}**
- Tally Synced: **${tallySynced}** | Pending: **${tallyPending}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchPayments(models) {
  const total = await models.Payment.count();
  const byStatus = await countByStatus(models.Payment, 'Payment');
  const totalAmount = await models.Payment.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('amount')), 'total']],
    raw: true,
  });

  return `**Payments:**
- Total: **${total}**
- Total Amount: **₹${Math.round(totalAmount?.total || 0).toLocaleString()}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

async function fetchDebitCreditNotes(models) {
  const total = await models.DebitCreditNote.count();
  const byType = await models.DebitCreditNote.findAll({
    attributes: ['dcn_type', [models.sequelize.fn('COUNT', models.sequelize.col('DebitCreditNote.id')), 'count']],
    group: ['dcn_type'], raw: true,
  });
  const typeLines = byType.map((t) => `- ${t.dcn_type}: **${t.count}**`);
  const totalAmount = await models.DebitCreditNote.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('amount')), 'total']],
    raw: true,
  });

  return `**Debit/Credit Notes:**
- Total: **${total}**
- Total Value: **₹${Math.round(totalAmount?.total || 0).toLocaleString()}**

**Type-wise:**
${typeLines.join('\n') || '- Koi DCN nahi hai'}`;
}

async function fetchCopq(models) {
  const total = await models.CopqEntry.count();
  const totalCost = await models.CopqEntry.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('cost_amount')), 'total']],
    raw: true,
  });
  const byCategory = await models.CopqEntry.findAll({
    attributes: ['category', [models.sequelize.fn('SUM', models.sequelize.col('cost_amount')), 'total']],
    group: ['category'], raw: true,
  });
  const catLines = byCategory.map((c) => `- ${c.category}: **₹${Math.round(c.total || 0).toLocaleString()}**`);

  return `**COPQ (Cost of Poor Quality):**
- Total Entries: **${total}**
- Total Cost: **₹${Math.round(totalCost?.total || 0).toLocaleString()}**

**Category-wise:**
${catLines.join('\n') || '- Koi COPQ entry nahi hai'}`;
}

// ── HR / Training ──

async function fetchTraining(models) {
  const total = await models.TrainingRecord.count();
  const byStatus = await countByStatus(models.TrainingRecord, 'TrainingRecord');
  const totalTopics = await models.TrainingTopic.count();
  const activeTopics = await models.TrainingTopic.count({ where: { is_active: true } });

  return `**Training Records:**
- Total Records: **${total}**
- Total Topics: **${totalTopics}** | Active: **${activeTopics}**

**Status-wise:**
${statusBreakdown(byStatus)}`;
}

// ── Maintenance ──

async function fetchBreakdowns(models, options = {}) {
  const { from, to, offset = 0 } = options;
  const dateWhere = (from || to) ? { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) } : null;
  const baseWhere = dateWhere ? { createdAt: dateWhere } : {};
  const label = options.label ? ` (${options.label})` : '';

  const total = await models.BreakdownRequest.count({ where: baseWhere });
  const byStatus = await models.BreakdownRequest.findAll({
    where: baseWhere,
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('BreakdownRequest.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);
  const open = byStatus.reduce((sum, s) => (['open', 'in_progress', 'assigned'].includes(s.status) ? sum + parseInt(s.count, 10) : sum), 0);

  const recent = await models.BreakdownRequest.findAll({
    where: baseWhere,
    attributes: ['id', 'status', 'symptoms', 'createdAt'],
    include: [{ model: models.Equipment, as: 'Equipment', attributes: ['name', 'equipment_code'] }],
    order: [['createdAt', 'DESC']], limit: 5, offset, raw: true, nest: true,
  });
  const recentLines = recent.map((r) => `- **#${r.id}** — ${r.Equipment?.name || 'N/A'} | ${r.status} | ${r.symptoms ? r.symptoms.substring(0, 40) : 'N/A'}`);
  const moreHint = total > offset + 5 ? `\n_"Aur dikhao" for more results_` : '';

  return `**Breakdown Requests${label}:**
- Total: **${total}** | Open/In-Progress: **${open}**

**Status-wise:**
${statusLines.join('\n') || '- Koi data nahi'}

**Recent Breakdowns:**
${recentLines.join('\n') || '- Koi breakdown nahi'}${moreHint}`;
}

async function fetchMaintenanceWOs(models, options = {}) {
  const { from, to, offset = 0 } = options;
  const dateWhere = (from || to) ? { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) } : null;
  const baseWhere = dateWhere ? { createdAt: dateWhere } : {};
  const label = options.label ? ` (${options.label})` : '';

  const total = await models.MaintenanceWorkOrder.count({ where: baseWhere });
  const byStatus = await models.MaintenanceWorkOrder.findAll({
    where: baseWhere,
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('MaintenanceWorkOrder.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);
  const open = await models.MaintenanceWorkOrder.count({ where: { ...baseWhere, status: { [Op.notIn]: ['completed', 'cancelled'] } } });

  const recent = await models.MaintenanceWorkOrder.findAll({
    where: baseWhere,
    attributes: ['id', 'wo_number', 'type', 'status', 'title'],
    include: [{ model: models.Equipment, as: 'Equipment', attributes: ['name', 'equipment_code'] }],
    order: [['createdAt', 'DESC']], limit: 5, offset, raw: true, nest: true,
  });
  const recentLines = recent.map((w) => `- **${w.wo_number}** — ${w.Equipment?.name || 'N/A'} | ${w.type} | ${w.status}`);
  const moreHint = total > offset + 5 ? `\n_"Aur dikhao" for more results_` : '';

  return `**Maintenance Work Orders${label}:**
- Total: **${total}** | Open: **${open}**

**Status-wise:**
${statusLines.join('\n') || '- Koi data nahi'}

**Recent WOs:**
${recentLines.join('\n') || '- Koi WO nahi hai'}${moreHint}`;
}

async function fetchPmWorkOrders(models, options = {}) {
  const { from, to, offset = 0 } = options;
  const dateWhere = (from || to) ? { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) } : null;
  const baseWhere = dateWhere ? { planned_date: dateWhere } : {};
  const label = options.label ? ` (${options.label})` : '';

  const total = await models.PmWorkOrder.count({ where: baseWhere });
  const byStatus = await models.PmWorkOrder.findAll({
    where: baseWhere,
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('PmWorkOrder.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);
  const completed = await models.PmWorkOrder.count({ where: { ...baseWhere, status: 'completed' } });
  const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue = await models.PmWorkOrder.count({
    where: { planned_date: { [Op.lt]: new Date() }, status: { [Op.notIn]: ['completed', 'cancelled', 'skipped'] } },
  });

  return `**PM Work Orders${label}:**
- Total: **${total}** | Completed: **${completed}** | Compliance: **${compliance}%**
- Overdue: **${overdue}**

**Status-wise:**
${statusLines.join('\n') || '- Koi PM WO nahi'}`;
}

async function fetchPmSchedules(models, options = {}) {
  const total = await models.PmSchedule.count();
  const byStatus = await models.PmSchedule.findAll({
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('PmSchedule.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);
  const overdue = await models.PmSchedule.count({
    where: { next_due_date: { [Op.lt]: new Date() }, status: 'active' },
  });
  const dueIn7 = await models.PmSchedule.count({
    where: { next_due_date: { [Op.between]: [new Date(), new Date(Date.now() + 7 * 86400000)] }, status: 'active' },
  });

  return `**PM Schedules:**
- Total: **${total}** | Overdue: **${overdue}** | Due in 7 days: **${dueIn7}**

**Status-wise:**
${statusLines.join('\n') || '- Koi schedule nahi'}`;
}

async function fetchLotoPermits(models, options = {}) {
  const { from, to } = options;
  const dateWhere = (from || to) ? { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) } : null;
  const baseWhere = dateWhere ? { valid_from: dateWhere } : {};
  const label = options.label ? ` (${options.label})` : '';

  const total = await models.LotoPermit.count({ where: baseWhere });
  const byStatus = await models.LotoPermit.findAll({
    where: baseWhere,
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('LotoPermit.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);
  const active = await models.LotoPermit.count({ where: { ...baseWhere, status: 'active' } });

  return `**LOTO Permits (Lockout/Tagout)${label}:**
- Total: **${total}** | Active: **${active}**

**Status-wise:**
${statusLines.join('\n') || '- Koi LOTO permit nahi'}`;
}

async function fetchDowntimeLogs(models, options = {}) {
  const { from, to } = options;
  const dateWhere = (from || to) ? { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) } : null;
  const baseWhere = dateWhere ? { start_time: dateWhere } : {};
  const label = options.label ? ` (${options.label})` : '';

  const total = await models.DowntimeLog.count({ where: baseWhere });
  const totalMins = await models.DowntimeLog.findOne({
    where: baseWhere,
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('duration_minutes')), 'total']],
    raw: true,
  });
  const totalHours = Math.round((parseFloat(totalMins?.total) || 0) / 60 * 10) / 10;

  const byType = await models.DowntimeLog.findAll({
    where: baseWhere,
    attributes: ['downtime_type', [models.sequelize.fn('SUM', models.sequelize.col('duration_minutes')), 'total_mins']],
    group: ['downtime_type'], raw: true,
  });
  const typeLines = byType.map((t) => `- ${t.downtime_type}: **${Math.round((parseFloat(t.total_mins) || 0) / 60 * 10) / 10} hrs**`);

  return `**Downtime Logs${label}:**
- Total Entries: **${total}**
- Total Downtime: **${totalHours} hours**

**By Type:**
${typeLines.join('\n') || '- Koi downtime record nahi'}`;
}

async function fetchMaintenanceCosts(models, options = {}) {
  const { from, to } = options;
  const dateWhere = (from || to) ? { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) } : null;
  const baseWhere = dateWhere ? { incurred_date: dateWhere } : {};
  const label = options.label ? ` (${options.label})` : '';

  const totalAmount = await models.MaintenanceCost.findOne({
    where: baseWhere,
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('amount')), 'total']],
    raw: true,
  });
  const total = Math.round(parseFloat(totalAmount?.total) || 0);

  const byType = await models.MaintenanceCost.findAll({
    where: baseWhere,
    attributes: ['cost_type', [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'total']],
    group: ['cost_type'], raw: true,
  });
  const typeLines = byType.map((t) => `- ${t.cost_type}: **₹${Math.round(parseFloat(t.total) || 0).toLocaleString()}**`);

  return `**Maintenance Costs${label}:**
- Total: **₹${total.toLocaleString()}**

**By Cost Type:**
${typeLines.join('\n') || '- Koi cost entry nahi'}`;
}

async function fetchMaintenanceKpis(models, options = {}) {
  const pmTotal = await models.PmWorkOrder.count({ where: { planned_date: { [Op.lte]: new Date() } } });
  const pmCompleted = await models.PmWorkOrder.count({ where: { planned_date: { [Op.lte]: new Date() }, status: 'completed' } });
  const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

  const mwoRows = await models.MaintenanceWorkOrder.findAll({
    where: { status: 'completed', started_at: { [Op.ne]: null }, completed_at: { [Op.ne]: null } },
    attributes: ['started_at', 'completed_at'], raw: true,
  });
  const mttr = mwoRows.length > 0
    ? Math.round((mwoRows.reduce((sum, r) => sum + (new Date(r.completed_at) - new Date(r.started_at)), 0) / mwoRows.length) / 3600000 * 10) / 10
    : null;

  const dtResult = await models.DowntimeLog.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('duration_minutes')), 'total']], raw: true,
  });
  const totalDowntimeHrs = Math.round((parseFloat(dtResult?.total) || 0) / 60 * 10) / 10;

  const openBreakdowns = await models.BreakdownRequest.count({
    where: { status: { [Op.notIn]: ['resolved', 'cancelled'] } },
  });

  return `**Maintenance KPIs:**
- PM Compliance: **${pmCompliance}%** (${pmCompleted}/${pmTotal} PM WOs completed)
- MTTR (Avg Repair Time): **${mttr !== null ? `${mttr} hrs` : 'Insufficient data'}**
- Total Downtime (all time): **${totalDowntimeHrs} hours**
- Open Breakdowns: **${openBreakdowns}**`;
}

// ── Mold Management ──

async function fetchMolds(models, options = {}) {
  if (!models.Mold) return 'Mold Management module abhi fully deployed nahi hua hai is system par.';
  const total = await models.Mold.count();
  const byStatus = await models.Mold.findAll({
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('Mold.id')), 'count']],
    group: ['status'], raw: true,
  });
  const statusLines = byStatus.map((s) => `- ${s.status}: **${s.count}**`);
  const inProd     = byStatus.find((s) => s.status === 'in_production')?.count || 0;
  const needsRepair = byStatus.reduce((sum, s) => (['repair_needed', 'in_repair'].includes(s.status) ? sum + parseInt(s.count, 10) : sum), 0);

  return `**Mold Master:**
- Total Molds: **${total}**
- In Production: **${inProd}** | Needs Repair: **${needsRepair}**

**Status-wise:**
${statusLines.join('\n') || '- Koi mold nahi'}`;
}

async function fetchMoldShotCount(models, options = {}) {
  if (!models.MoldShotSummary) return 'Mold shot count module abhi deploy nahi hua.';
  const total    = await models.MoldShotSummary.count();
  const nearEol  = await models.MoldShotSummary.count({ where: { life_percentage: { [Op.gte]: 85 } } });
  const critical = await models.MoldShotSummary.count({ where: { life_percentage: { [Op.gte]: 95 } } });
  const totalShots = await models.MoldShotSummary.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('total_shots')), 'total']], raw: true,
  });

  return `**Mold Shot Count Summary:**
- Molds Tracked: **${total}**
- Near EOL (≥85% life used): **${nearEol}**
- Critical (≥95% life used): **${critical}**
- Total Shots (all molds): **${Math.round(totalShots?.total || 0).toLocaleString()}**`;
}

async function fetchMoldLifeAlerts(models, options = {}) {
  if (!models.MoldLifeAlert) return 'Mold life management module abhi deploy nahi hua.';
  const total = await models.MoldLifeAlert.count({ where: { status: { [Op.in]: ['triggered', 'acknowledged'] } } });
  const byType = await models.MoldLifeAlert.findAll({
    where: { status: { [Op.in]: ['triggered', 'acknowledged'] } },
    attributes: ['alert_type', [models.sequelize.fn('COUNT', models.sequelize.col('MoldLifeAlert.id')), 'count']],
    group: ['alert_type'], raw: true,
  });
  const typeLines = byType.map((t) => `- ${t.alert_type}: **${t.count}**`);

  return `**Mold Life Alerts (Active):**
- Total Active Alerts: **${total}**

**By Alert Type:**
${typeLines.join('\n') || '- Koi active alert nahi — sab molds safe hain!'}`;
}

async function fetchMoldIssueReturn(models, options = {}) {
  if (!models.MoldIssueReturn) return 'Mold issue/return module abhi deploy nahi hua.';
  const total   = await models.MoldIssueReturn.count();
  const issued  = await models.MoldIssueReturn.count({ where: { type: 'issue', return_date: null } });
  const returns = await models.MoldIssueReturn.count({ where: { type: 'return' } });

  return `**Mold Issue / Return:**
- Total Transactions: **${total}**
- Currently Issued (not returned): **${issued}**
- Total Returns: **${returns}**`;
}

// ── Equipment Master (Maintenance) ──────────────────────────────────────────
async function fetchEquipment(models) {
  if (!models.Equipment) return 'Equipment Master module abhi deploy nahi hua.';
  const total   = await models.Equipment.count();
  const active  = await models.Equipment.count({ where: { is_active: true } });
  const byStatus = await models.Equipment.findAll({
    attributes: ['status', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
    group: ['status'], raw: true,
  });
  const byCrit = await models.Equipment.findAll({
    attributes: ['criticality', [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']],
    group: ['criticality'], raw: true,
  });
  const STATUS_LABELS = { operational: 'Operational', under_maintenance: 'Under Maintenance', breakdown: 'Breakdown', decommissioned: 'Decommissioned' };
  const CRIT_LABELS   = { A: 'Critical (A)', B: 'Important (B)', C: 'General (C)' };
  const statusLines = byStatus.map((s) => `- ${STATUS_LABELS[s.status] || s.status}: **${s.count}**`);
  const critLines   = byCrit.map((c) => `- ${CRIT_LABELS[c.criticality] || c.criticality}: **${c.count}**`);
  return `**Equipment Master:**\n- Total: **${total}** | Active: **${active}**\n\n**Status:**\n${statusLines.join('\n') || '- N/A'}\n\n**Criticality:**\n${critLines.join('\n') || '- N/A'}`;
}

// ── Maintenance Health Dashboard ─────────────────────────────────────────────
async function fetchMaintenanceHealth(models) {
  if (!models.Equipment) return 'Maintenance health module abhi deploy nahi hua.';
  const total    = await models.Equipment.count({ where: { is_active: true } });
  const healthy  = await models.Equipment.count({ where: { is_active: true, current_health_score: { [Op.gte]: 70 } } });
  const warning  = await models.Equipment.count({ where: { is_active: true, current_health_score: { [Op.between]: [40, 69] } } });
  const critical = await models.Equipment.count({ where: { is_active: true, current_health_score: { [Op.lt]: 40 } } });
  return `**Equipment Health Dashboard:**\n- Total Active Equipment: **${total}**\n- Healthy (≥70): **${healthy}** ✅\n- Warning (40–69): **${warning}** ⚠️\n- Critical (<40): **${critical}** 🔴`;
}

// ── Spare Parts ──────────────────────────────────────────────────────────────
async function fetchSpareParts(models) {
  if (!models.SparePart) return 'Spare Parts module abhi deploy nahi hua.';
  const total    = await models.SparePart.count();
  const active   = await models.SparePart.count({ where: { is_active: true } });
  const lowStock = await models.SparePart.count({
    where: { is_active: true, current_stock: { [Op.lt]: models.sequelize.col('min_stock') } },
  });
  const parts = await models.SparePart.findAll({
    where: { is_active: true },
    attributes: ['part_code', 'name', 'current_stock', 'min_stock', 'unit_of_measure'],
    order: [['name', 'ASC']], limit: 10, raw: true,
  });
  const lines = parts.map((p) => {
    const low = parseFloat(p.current_stock) < parseFloat(p.min_stock) ? ' ⚠️ Low' : '';
    return `- **${p.name}** (${p.part_code}): ${p.current_stock} ${p.unit_of_measure || ''}${low}`;
  });
  const more = active > 10 ? `\n...aur ${active - 10} spare parts` : '';
  return `**Spare Parts:**\n- Total: **${total}** | Active: **${active}** | Low Stock: **${lowStock}** ⚠️\n\n${lines.join('\n')}${more}`;
}

// ── Mold Cavities ────────────────────────────────────────────────────────────
async function fetchMoldCavities(models) {
  if (!models.MoldCavity) return 'Cavity tracking module abhi deploy nahi hua.';
  const total      = await models.MoldCavity.count();
  const active     = await models.MoldCavity.count({ where: { status: 'active' } });
  const flagged    = await models.MoldCavity.count({ where: { status: 'flagged' } });
  const blocked    = await models.MoldCavity.count({ where: { status: 'blocked' } });
  const underRepair= await models.MoldCavity.count({ where: { status: 'under_repair' } });
  return `**Mold Cavity Tracking:**\n- Total Cavities: **${total}**\n- Active: **${active}** | Flagged: **${flagged}** | Blocked: **${blocked}** | Under Repair: **${underRepair}**`;
}

// ── Mold Store Dashboard ─────────────────────────────────────────────────────
async function fetchMoldStore(models) {
  if (!models.Mold) return 'Mold store module abhi deploy nahi hua.';
  const inStorage  = await models.Mold.count({ where: { status: 'in_storage',   is_active: true } });
  const inProd     = await models.Mold.count({ where: { status: 'in_production', is_active: true } });
  const inRepair   = await models.Mold.count({ where: { status: { [Op.in]: ['in_repair', 'repair_needed'] }, is_active: true } });
  const registered = await models.Mold.count({ where: { status: 'registered',   is_active: true } });
  return `**Mold Store Dashboard:**\n- In Storage: **${inStorage}**\n- In Production: **${inProd}**\n- In Repair / Repair Needed: **${inRepair}**\n- Registered (Pending Trial): **${registered}**`;
}

// ── Mold PM Schedule ─────────────────────────────────────────────────────────
async function fetchMoldPm(models) {
  if (!models.MoldPmSchedule) return 'Mold PM module abhi deploy nahi hua.';
  const total     = await models.MoldPmSchedule.count();
  const overdue   = await models.MoldPmSchedule.count({ where: { status: 'overdue' } });
  const pending   = await models.MoldPmSchedule.count({ where: { status: 'pending' } });
  const completed = await models.MoldPmSchedule.count({ where: { status: 'completed' } });
  return `**Mold PM Schedule:**\n- Total: **${total}**\n- Overdue: **${overdue}** 🔴 | Pending: **${pending}** | Completed: **${completed}** ✅`;
}

// ── Mold Repair ──────────────────────────────────────────────────────────────
async function fetchMoldRepair(models) {
  if (!models.MoldRepairRequest) return 'Mold repair module abhi deploy nahi hua.';
  const total      = await models.MoldRepairRequest.count();
  const open       = await models.MoldRepairRequest.count({ where: { status: { [Op.in]: ['requested', 'approved', 'in_progress', 'sub_contracted'] } } });
  const completed  = await models.MoldRepairRequest.count({ where: { status: 'completed' } });
  const critical   = await models.MoldRepairRequest.count({ where: { urgency: 'critical' } });
  return `**Mold Repair Requests:**\n- Total: **${total}**\n- Open / In Progress: **${open}** | Completed: **${completed}** ✅\n- Critical Urgency: **${critical}** 🔴`;
}

// ── Mold Trials ──────────────────────────────────────────────────────────────
async function fetchMoldTrials(models) {
  if (!models.MoldTrial) return 'Mold trials module abhi deploy nahi hua.';
  const total    = await models.MoldTrial.count();
  const passed   = await models.MoldTrial.count({ where: { status: 'passed' } });
  const failed   = await models.MoldTrial.count({ where: { status: 'failed' } });
  const planned  = await models.MoldTrial.count({ where: { status: 'planned' } });
  const inProg   = await models.MoldTrial.count({ where: { status: 'in_progress' } });
  return `**Mold Trials:**\n- Total: **${total}**\n- Passed: **${passed}** ✅ | Failed: **${failed}** ❌\n- Planned: **${planned}** | In Progress: **${inProg}**`;
}

// ── Mold Cost Tracking ───────────────────────────────────────────────────────
async function fetchMoldCost(models) {
  if (!models.MoldCost) return 'Mold cost module abhi deploy nahi hua.';
  const total = await models.MoldCost.count();
  const totalAmt = await models.MoldCost.findOne({
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('amount')), 'total']],
    raw: true,
  });
  const byType = await models.MoldCost.findAll({
    attributes: ['cost_type', [models.sequelize.fn('SUM', models.sequelize.col('amount')), 'total']],
    group: ['cost_type'], raw: true,
  });
  const typeLines = byType.map((t) => `- ${t.cost_type}: **₹${Math.round(t.total || 0).toLocaleString()}**`);
  return `**Mold Cost Tracking:**\n- Total Entries: **${total}**\n- Total Amount: **₹${Math.round(totalAmt?.total || 0).toLocaleString()}**\n\n**By Type:**\n${typeLines.join('\n') || '- Koi cost entry nahi'}`;
}

// ── Mold Documents ───────────────────────────────────────────────────────────
async function fetchMoldDocuments(models) {
  if (!models.MoldDocument) return 'Mold documents module abhi deploy nahi hua.';
  const total = await models.MoldDocument.count();
  return `**Mold Documents:**\n- Total Documents: **${total}**\n\n[Mold documents dekhne ke liye Mold Master page par jaiye]`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Intent → Handler map ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const DATA_HANDLERS = {
  // People & Setup
  roles:                fetchRoles,
  departments:          fetchDepartments,
  users:                fetchUsers,
  department_users:     fetchDepartmentUsers,
  employee_lookup:      fetchEmployeeLookup,
  // Masters — Sites overview
  sites:                    fetchSites,
  // Masters — Site sub-sections
  site_config:              fetchSiteConfig,
  site_nomenclature:        fetchSiteNomenclature,
  site_inventory_config:    fetchSiteInventoryConfig,
  site_costing_config:      fetchSiteCostingConfig,
  site_maintenance_config:  fetchSiteMaintenanceConfig,
  site_contact:             fetchSiteContact,
  site_employees:           fetchSiteEmployees,
  // Masters — Shifts
  shifts:                   fetchShifts,
  // Masters — Warehouses
  warehouses:               fetchWarehouses,
  warehouse_config:         fetchWarehouseConfig,
  // Masters — Integrations
  integrations:             fetchIntegrations,
  items:                fetchItems,
  machines:             fetchMachines,
  vendors:              fetchVendors,
  customers:            fetchCustomers,
  transporters:         fetchTransporters,
  // Orders / Sales
  customer_orders:      fetchCustomerOrders,
  rfqs:                 fetchRfqs,
  quotations:           fetchQuotations,
  // Procurement
  purchase_orders:      fetchPurchaseOrders,
  scars:                fetchScars,
  // Store / Warehouse
  grns:                 fetchGrns,
  inventory:            fetchInventory,
  material_requests:    fetchMaterialRequests,
  issue_slips:          fetchIssueSlips,
  stock_adjustments:    fetchStockAdjustments,
  // Production
  work_orders:          fetchWorkOrders,
  job_cards:            fetchJobCards,
  scrap_vouchers:       fetchScrapVouchers,
  downtime:             fetchDowntime,
  // Subcontracting
  subcontract_challans: fetchSubcontractChallans,
  // Dispatch
  dispatch_orders:      fetchDispatchOrders,
  delivery_challans:    fetchDeliveryChallans,
  // Quality
  complaints:           fetchComplaints,
  ncrs:                 fetchNcrs,
  capas:                fetchCapas,
  iqc_inspections:      fetchIqcInspections,
  lqc_inspections:      fetchLqcInspections,
  pqc_inspections:      fetchPqcInspections,
  oqc_inspections:      fetchOqcInspections,
  instruments:          fetchInstruments,
  // NPD
  drawings:             fetchDrawings,
  pfmeas:               fetchPfmeas,
  boms:                 fetchBoms,
  // Finance
  sales_invoices:       fetchSalesInvoices,
  payments:             fetchPayments,
  debit_credit_notes:   fetchDebitCreditNotes,
  copq:                 fetchCopq,
  // HR
  training:             fetchTraining,
  // Maintenance
  maintenance_breakdowns:  fetchBreakdowns,
  maintenance_work_orders: fetchMaintenanceWOs,
  pm_work_orders:          fetchPmWorkOrders,
  pm_schedules:            fetchPmSchedules,
  loto_permits:            fetchLotoPermits,
  downtime_logs:           fetchDowntimeLogs,
  maintenance_costs:       fetchMaintenanceCosts,
  maintenance_kpis:        fetchMaintenanceKpis,
  // Maintenance — new pages
  equipment:               fetchEquipment,
  maintenance_health:      fetchMaintenanceHealth,
  spare_parts:             fetchSpareParts,
  // Mold Management
  molds:                   fetchMolds,
  mold_shot_count:         fetchMoldShotCount,
  mold_life_alerts:        fetchMoldLifeAlerts,
  mold_issue_return:       fetchMoldIssueReturn,
  // Mold Management — new pages
  mold_cavities:           fetchMoldCavities,
  mold_store:              fetchMoldStore,
  mold_pm:                 fetchMoldPm,
  mold_repair:             fetchMoldRepair,
  mold_trials:             fetchMoldTrials,
  mold_cost:               fetchMoldCost,
  mold_documents:          fetchMoldDocuments,
};

// ── Pick random from array ──────────────────────────────────────────────────
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Entity Query Layer ────────────────────────────────────────────────────────
// Runs BEFORE keyword/Bayes. Catches "Vikram ka department", "who is Rajesh",
// "PO-2024-003 ka status", etc. — queries that have a specific named entity.
// ══════════════════════════════════════════════════════════════════════════════

// ── Document number regex ─────────────────────────────────────────────────────
const DOC_NUMBER_REGEX = /\b(mwo|pwo|wo|po|grn|so|dc|mr|jc|mol|mo)-[\w/-]+\b/i;

// Doc prefix → { model name, number field, display name }
const DOC_PREFIX_MAP = {
  wo:   { model: 'WorkOrder',            field: 'wo_no',       label: 'Work Order' },
  mwo:  { model: 'MaintenanceWorkOrder', field: 'wo_number',   label: 'Maintenance WO' },
  pwo:  { model: 'PmWorkOrder',          field: 'wo_number',   label: 'PM Work Order' },
  po:   { model: 'PurchaseOrder',        field: 'po_no',       label: 'Purchase Order' },
  grn:  { model: 'Grn',                  field: 'grn_no',      label: 'GRN' },
  so:   { model: 'CustomerOrder',        field: 'order_no',    label: 'Sales Order' },
  dc:   { model: 'DeliveryChallan',      field: 'dc_number',   label: 'Delivery Challan' },
  mr:   { model: 'MaterialRequest',      field: 'mr_number',   label: 'Material Request' },
  jc:   { model: 'JobCard',             field: 'jc_number',   label: 'Job Card' },
  mol:  { model: 'Mold',                field: 'mold_code',   label: 'Mold' },
};

async function resolveDocumentQuery(models, docNo) {
  const prefix = docNo.split('-')[0].toLowerCase();
  const cfg    = DOC_PREFIX_MAP[prefix];
  if (!cfg || !models[cfg.model]) {
    return `"${docNo}" ka type pehchaan nahi paaya. Check karo — supported: WO, MWO, PWO, PO, GRN, SO, DC, MR, JC, MOL.`;
  }
  const record = await models[cfg.model].findOne({
    where: { [cfg.field]: { [Op.iLike]: docNo } },
    raw: true,
  });
  if (!record) return `**${cfg.label} "${docNo}"** nahi mila. Number check karo.`;

  // Format key fields generically
  const skip    = new Set(['created_by', 'updated_by', 'id']);
  const entries = Object.entries(record)
    .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && v !== '')
    .slice(0, 10)
    .map(([k, v]) => `- **${k}:** ${v}`);

  return `**${cfg.label}: ${docNo}**\n${entries.join('\n')}`;
}

// ── Person-question patterns ──────────────────────────────────────────────────
// Each entry: { regex, type }  — entity name is captured in group 1
const PERSON_QUERY_PATTERNS = [
  // ── Department ──────────────────────────────────────────────────────────────

  // "tell me in which / tell me which department is X from"
  { regex: /^tell\s+me\s+(?:in\s+)?which\s+department\s+(?:is\s+)?(.+?)\s*(?:from|working|at|in|belongs?|assigned)?$/i, type: 'dept' },
  // "in which department is X from/working/at/in" (end word present)
  { regex: /^(?:in\s+)?which\s+department\s+is\s+(.+?)\s+(?:from|working|at|employed|based|in|assigned|placed)$/i, type: 'dept' },
  // "which department is X" (no end word — name goes to end of string)
  { regex: /^(?:in\s+)?which\s+department\s+is\s+(.+?)$/i,                                        type: 'dept' },
  // "in which department does X work"
  { regex: /^(?:in\s+)?which\s+department\s+does\s+(.+?)\s+(?:work|belong|report)/i,              type: 'dept' },
  // "X is from which / belongs to which / works in which / is in which department"
  { regex: /^(.+?)\s+(?:is from which|belongs to which|works in which|is in which|is from which)\s+department/i, type: 'dept' },
  // "X is working in which department" / "X works in which department"
  { regex: /^(.+?)\s+(?:is\s+)?(?:working|work)\s+in\s+which\s+department/i,                     type: 'dept' },
  // "X is in which department" / "X belongs in which department"
  { regex: /^(.+?)\s+(?:is\s+in|belongs\s+to|is\s+from|comes\s+from)\s+which\s+department/i,     type: 'dept' },
  // "what department is X in / from / at"
  { regex: /^what\s+(?:department|dept)\s+(?:is\s+)?(.+?)\s+(?:in|from|at|belong|works)/i,       type: 'dept' },
  // "what is X's department" / "what is the department of X"
  { regex: /^what\s+is\s+(?:the\s+)?department\s+(?:of|for)\s+(.+)/i,                            type: 'dept' },
  { regex: /^what\s+is\s+(.+?)(?:'s|s')?\s+department/i,                                         type: 'dept' },
  // "department of X" / "department for X"
  { regex: /^department\s+(?:of|for)\s+(.+)/i,                                                    type: 'dept' },
  // "X's department"
  { regex: /^(.+?)(?:'s|s')\s+department/i,                                                       type: 'dept' },
  // "X ka / ki / ke department kya hai / batao"
  { regex: /^(.+?)\s+(?:ka|ki|ke)\s+department(?:\s+kya hai|\s+batao|\s+dikhao|$)/i,             type: 'dept' },
  // "X ka vibhag kya hai" (Hindi for department)
  { regex: /^(.+?)\s+(?:ka|ki|ke)\s+vibhag(?:\s+kya hai|\s+batao|$)/i,                           type: 'dept' },
  // "X kis department mein hai / X kis department mein kaam karta hai"
  { regex: /^(.+?)\s+kis(?:se)?\s+(?:department|dept|vibhag)\s+(?:mein|me|se|ka|hai)/i,          type: 'dept' },
  // "X kaunse department mein hai"
  { regex: /^(.+?)\s+(?:kaunse|konse)\s+(?:department|dept)\s+(?:mein|me|se|hai|ka)/i,           type: 'dept' },
  // "X konse department ka hai"
  { regex: /^(.+?)\s+konsa\s+(?:department|dept)\s+(?:hai|mein)/i,                               type: 'dept' },
  // "X department mein hai"
  { regex: /^(.+?)\s+(?:kis|kaunse|konse)?\s*department\s+(?:mein|me)\s+(?:hai|kaam)/i,          type: 'dept' },

  // ── Role / Designation ───────────────────────────────────────────────────────
  // "X ka role / designation / post kya hai"
  { regex: /^(.+?)\s+(?:ka|ki|ke)\s+(?:role|designation|post|position|job)(?:\s+kya hai|\s+batao|$)/i, type: 'role' },
  // "what is X's role / designation"
  { regex: /^what\s+is\s+(.+?)(?:'s|s')?\s+(?:role|designation|position|job|post)/i,             type: 'role' },
  // "what role does X have / hold / play"
  { regex: /^what\s+role\s+does\s+(.+?)\s+(?:have|hold|play|handle)/i,                           type: 'role' },
  // "what does X do / what does X work as"
  { regex: /^what\s+(?:does\s+)?(.+?)\s+(?:do|does|work\s+as|handle)/i,                         type: 'role' },
  // "X kya karta / karti hai"
  { regex: /^(.+?)\s+kya\s+(?:karta|karti|karte)\s+(?:hai|hain|ho)/i,                           type: 'role' },
  // "X ka kaam kya hai"
  { regex: /^(.+?)\s+(?:ka|ke|ki)\s+(?:kaam|work|job)\s+(?:kya hai|batao|dikhao)/i,             type: 'role' },
  // "X ki designation kya hai"
  { regex: /^(.+?)\s+ki\s+(?:designation|position)\s+(?:kya|batao)/i,                            type: 'role' },

  // ── Contact ──────────────────────────────────────────────────────────────────
  // "X ka email / phone / phone number / mobile number / contact kya hai"
  { regex: /^(.+?)\s+(?:ka|ki|ke)\s+(?:email|phone(?:\s+number)?|mobile(?:\s+number)?|number|contact|whatsapp)(?:\s+kya hai|\s+batao|\s+do|\s+chahiye|$)/i, type: 'contact' },
  // "email / phone / contact of X" / "contact for X"
  { regex: /^(?:email|phone|contact|number|mobile)\s+(?:of|for)\s+(.+)/i,                        type: 'contact' },
  // "contact info / details / number of X"
  { regex: /^contact\s+(?:info|information|details?|number)?\s+(?:of|for)\s+(.+)/i,              type: 'contact' },
  // "share / give me / provide the contact details of X"
  { regex: /^(?:share|give(?:\s+me)?|provide|get)\s+(?:the\s+)?contact\s+(?:details?|info(?:rmation)?|number)?\s*(?:of|for)\s+(.+)/i, type: 'contact' },
  // "share / give me X's contact"
  { regex: /^(?:share|give(?:\s+me)?|provide|get)\s+(?:the\s+)?(.+?)(?:'s|s')?\s+(?:contact|email|phone|number|mobile)(?:\s+(?:details?|info(?:rmation)?))?$/i, type: 'contact' },
  // "how to contact X" / "how to reach X"
  { regex: /^how\s+(?:to\s+)?(?:contact|reach|call|message|connect\s+with)\s+(.+)/i,             type: 'contact' },
  // "X se kaise contact / baat / milna"
  { regex: /^(.+?)\s+se\s+(?:kaise contact|kaise baat|kaise milna|kaise reach)/i,                type: 'contact' },
  // "X ka number do" / "X ka email do"
  { regex: /^(.+?)\s+(?:ka|ki|ke)\s+(?:number|email|contact)\s+(?:do|dena|batao|chahiye)/i,     type: 'contact' },
  // "X ki contact details" / "X ki contact info"
  { regex: /^(.+?)\s+(?:ki|ka|ke)\s+contact\s+(?:details?|info(?:rmation)?|number)/i,           type: 'contact' },
  // "X's contact" / "X's phone" / "X's email"
  { regex: /^(.+?)(?:'s|s')\s+(?:contact|phone|email|mobile|number)(?:\s+(?:details?|info(?:rmation)?))?$/i, type: 'contact' },

  // ── Full profile / "who is X" ─────────────────────────────────────────────
  // "who is X" / "who is this X"
  { regex: /^who\s+is\s+(?:this\s+|that\s+)?(.+)/i,                                              type: 'profile' },
  // "X kaun hai / hain"
  { regex: /^(.+?)\s+kaun\s+(?:hai|hain|he|she)/i,                                               type: 'profile' },
  // "X ki / ka details / profile / info batao"
  { regex: /^(.+?)\s+(?:ki|ka|ke)\s+(?:details?|profile|info(?:rmation)?|summary)\s*(?:batao|dikhao|chahiye|do)?/i, type: 'profile' },
  // "X ke baare mein batao / bata"
  { regex: /^(.+?)\s+ke\s+baare\s+(?:mein|me)\s+(?:batao|bata|janna|info)/i,                   type: 'profile' },
  // "tell me about X" / "tell me who is X" / "show me X" / "describe X"
  { regex: /^(?:tell\s+me\s+about|tell\s+me\s+who\s+is|show\s+me|describe)\s+(.+)/i,             type: 'profile' },
  // "know about X" / "about X" (after prefix stripping: "i want to know about X" → "know about X")
  { regex: /^(?:know\s+about|about)\s+(.+)/i,                                                     type: 'profile' },
  // "share / give me / provide details of X" / "get details of X"
  { regex: /^(?:share|give(?:\s+me)?|provide|get)\s+(?:the\s+)?(?:details?|profile|info(?:rmation)?)\s+(?:of|for|about)\s+(.+)/i, type: 'profile' },
  // "share / give me X's details"
  { regex: /^(?:share|give(?:\s+me)?|provide|get)\s+(?:the\s+)?(.+?)(?:'s|s')?\s+(?:details?|profile|info(?:rmation)?|summary)$/i, type: 'profile' },
  // "X's profile" / "X's details"
  { regex: /^(.+?)(?:'s|s')\s+(?:profile|details|info|information)/i,                            type: 'profile' },
  // "find / search for / lookup X employee"
  { regex: /^(?:find|search\s+for|lookup|look\s+up|show)\s+employee\s+(.+)/i,                   type: 'profile' },
];

// Words that look like entities but are actually generic — skip them
const GENERIC_WORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'koi', 'yeh', 'woh', 'jo', 'sabhi',
  'all', 'every', 'har', 'kuch', 'it', 'he', 'she', 'they', 'we', 'i',
]);

// Single-word/phrase prefixes to repeatedly strip before pattern matching.
// Applied in a loop so "could you please tell me about X" → "about X" → handled.
// Only strip true filler/politeness words — NOT content words like "tell me",
// "show me", "give me" since those are used as keywords inside the patterns.
const STRIP_PREFIXES = [
  /^please\s+/i,
  /^kindly\s+/i,
  /^hey[,!\s]+/i,
  /^hi[,!\s]+/i,
  /^hello[,!\s]+/i,
  /^can\s+you\s+(?:please\s+)?/i,
  /^could\s+you\s+(?:please\s+)?/i,
  /^would\s+you\s+(?:please\s+)?/i,
  /^i\s+want\s+to\s+know\s+/i,
  /^i\s+need\s+to\s+know\s+/i,
  /^i\s+(?:am\s+)?(?:looking|trying)\s+(?:to\s+find|to\s+know)\s+/i,
];

function stripPolitePrefixes(s) {
  let prev = '';
  while (prev !== s) {
    prev = s;
    for (const re of STRIP_PREFIXES) s = s.replace(re, '').trim();
  }
  return s;
}

function detectPersonQuery(input) {
  const stripped = stripPolitePrefixes(input);
  // Try both original and stripped so patterns work either way
  const candidates = stripped !== input ? [input, stripped] : [input];

  for (const text of candidates) {
    for (const p of PERSON_QUERY_PATTERNS) {
      const m = text.match(p.regex);
      if (!m) continue;
      const name = m[1].trim().toLowerCase();
      if (GENERIC_WORDS.has(name) || name.length < 2) continue;
      return { type: p.type, name: m[1].trim() };
    }
  }
  return null;
}

async function resolvePersonQuery(models, name, type) {
  const users = await models.User.findAll({
    where: {
      [Op.or]: [
        { name:        { [Op.iLike]: `%${name}%` } },
        { employee_id: { [Op.iLike]: `%${name}%` } },
        { email:       { [Op.iLike]: `%${name}%` } },
      ],
    },
    include: [
      { model: models.Department, attributes: ['name'] },
      { model: models.Role,       attributes: ['label'] },
    ],
    attributes: ['name', 'employee_id', 'email', 'phone', 'is_active'],
    limit: 3, raw: true, nest: true,
  });

  if (!users.length) {
    return `"${name}" naam ka koi employee nahi mila.\nTry: "find employee ${name}" ya full naam use karo.`;
  }
  if (users.length > 1) {
    const list = users.map((u) => `- **${u.name}** (${u.employee_id || 'N/A'}) — ${u.Department?.name || 'N/A'}`).join('\n');
    return `"${name}" se **${users.length}** employees mile:\n${list}\n\nZyada specific naam try karo.`;
  }

  const u = users[0];
  if (type === 'dept') {
    return `**${u.name}** (${u.employee_id || 'N/A'}) — **${u.Department?.name || 'Koi department assign nahi'}** department mein hai.`;
  }
  if (type === 'role') {
    return `**${u.name}** (${u.employee_id || 'N/A'})\n- Role: **${u.Role?.label || 'N/A'}**\n- Department: ${u.Department?.name || 'N/A'}`;
  }
  if (type === 'contact') {
    return `**${u.name}** (${u.employee_id || 'N/A'})\n- Email: **${u.email || 'N/A'}**\n- Phone: **${u.phone || 'N/A'}**`;
  }
  // Full profile
  return `**${u.name}**\n- Employee ID: ${u.employee_id || 'N/A'}\n- Department: **${u.Department?.name || 'N/A'}**\n- Role: **${u.Role?.label || 'N/A'}**\n- Email: ${u.email || 'N/A'}\n- Phone: ${u.phone || 'N/A'}\n- Status: ${u.is_active ? 'Active' : 'Inactive'}`;
}

// ── Intent → Frontend page route ─────────────────────────────────────────────
const INTENT_TO_ROUTE = {
  // People & Setup
  users:                   '/masters/employees',
  department_users:        '/masters/employees',
  employee_lookup:         '/masters/employees',
  roles:                   '/masters/employees',
  departments:             '/masters/employees',
  // Masters — Sites
  sites:                    '/masters/configuration',
  site_config:              '/masters/configuration',
  site_nomenclature:        '/masters/configuration',
  site_inventory_config:    '/masters/configuration',
  site_costing_config:      '/masters/costing',
  site_maintenance_config:  '/masters/configuration',
  site_contact:             '/masters/configuration',
  site_employees:           '/masters/configuration',
  // Masters — Shifts
  shifts:                   '/masters/shifts',
  // Masters — Warehouses
  warehouses:               '/masters/inventory/warehouses',
  warehouse_config:         '/masters/inventory/warehouses',
  // Masters — Integrations
  integrations:             '/masters/integrations',
  items:                   '/masters/production/items',
  machines:                '/masters/production/machines',
  vendors:                 '/masters/planning/vendors',
  customers:               '/masters/planning/customers',
  transporters:            '/dispatch/transporters',
  downtime:                '/masters/production/downtime',
  // Orders / Sales
  customer_orders:         '/orders/customer-po',
  rfqs:                    '/orders/rfq',
  quotations:              '/orders/quotation',
  // Procurement
  purchase_orders:         '/procurement/purchase-orders',
  scars:                   '/procurement/scar',
  boms:                    '/procurement/bom-explosion',
  // Store / Warehouse
  grns:                    '/store/grn',
  inventory:               '/store/inventory-dashboard',
  material_requests:       '/store/material-request',
  issue_slips:             '/store/issue-slip',
  stock_adjustments:       '/store/stock-adjustment',
  // Production
  work_orders:             '/production/work-orders',
  job_cards:               '/production/job-cards',
  scrap_vouchers:          '/production/scrap',
  iqc_inspections:         '/production/iqc',
  lqc_inspections:         '/production/lqc',
  pqc_inspections:         '/production/pqc',
  oqc_inspections:         '/production/oqc',
  // Subcontracting
  subcontract_challans:    '/subcontracting/outward',
  // Dispatch
  dispatch_orders:         '/dispatch/orders',
  delivery_challans:       '/dispatch/challans',
  // Quality
  complaints:              '/quality/complaints',
  ncrs:                    '/quality/ncr',
  capas:                   '/quality/capa',
  instruments:             '/quality/instruments',
  // NPD
  drawings:                '/quality/drawings',
  pfmeas:                  '/quality/pfmea',
  // Finance
  sales_invoices:          '/accounts/invoices',
  payments:                '/accounts/payments',
  debit_credit_notes:      '/accounts/debit-credit-notes',
  copq:                    '/accounts/copq',
  // HR
  training:                '/hr/training-records',
  // Maintenance
  equipment:               '/maintenance/equipment',
  maintenance_health:      '/maintenance/health',
  spare_parts:             '/maintenance/spare-parts',
  maintenance_breakdowns:  '/maintenance/breakdown',
  maintenance_work_orders: '/maintenance/breakdown',
  pm_work_orders:          '/maintenance/pm',
  pm_schedules:            '/maintenance/pm',
  loto_permits:            '/maintenance/loto',
  downtime_logs:           '/maintenance/downtime',
  maintenance_costs:       '/maintenance/kpi',
  maintenance_kpis:        '/maintenance/kpi',
  // Mold
  molds:                   '/mold/master',
  mold_shot_count:         '/mold/shot-count',
  mold_life_alerts:        '/mold/life',
  mold_issue_return:       '/mold/issue-return',
  mold_cavities:           '/mold/cavities',
  mold_store:              '/mold/store',
  mold_pm:                 '/mold/pm',
  mold_repair:             '/mold/repair',
  mold_trials:             '/mold/trial',
  mold_cost:               '/mold/cost',
  mold_documents:          '/mold/documents',
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Keyword-based pre-check ─────────────────────────────────────────────────
// ORDER MATTERS — first match wins. More specific rules go first.
// ══════════════════════════════════════════════════════════════════════════════
const KEYWORD_RULES = [
  // ── General users/employees — name listing (HIGHEST priority) ──
  { keywords: ['name all employees', 'name all the employees', 'list all employees', 'employee names', 'all employee names', 'employee list dikhao', 'sabhi employees ke naam', 'naam dikhao', 'sab employees ke naam', 'what are the names', 'what are their names', 'inke naam bata', 'names dikhao', 'employee name list', 'give all names', 'give me all names', 'give all employee', 'employees ke naam', 'employees ke naam bata', 'employees ke naam dikhao', 'naam bata employees', 'all the employees names', 'all employees ke naam', 'sab logo ke naam', 'sabhi logo ke naam', 'list of employees', 'list of all employees',
    // "give/show employee details" without a specific name → list all employees
    'employee details', 'give employee details', 'show employee details', 'get employee details',
    'employee detail', 'give employee detail', 'employee information', 'employee info',
    'all employee details', 'sabhi employees ki details', 'employees ki details'], intent: 'users' },

  // ── All departments → show everyone ──
  { keywords: ['from all departments', 'all departments employees', 'har department ke employees', 'all departments show', 'name from all', 'employees from all'], intent: 'department_users' },

  // ── General users/employees (BEFORE department-specific) ──
  { keywords: ['all employees', 'all users', 'show all employees', 'show all users', 'sabhi employees', 'total users', 'total employees', 'kitne users', 'kitne employees', 'users dikhao', 'user count', 'employees count', 'how many users', 'how many employees'], intent: 'users' },

  // ── Department-specific user queries ──
  { keywords: ['email of', 'email id of', 'phone of', 'contact of'],                  intent: 'department_users' },
  { keywords: ['hr team', 'hr employees', 'hr ke', 'hr wale', 'hr department'],        intent: 'department_users' },
  { keywords: ['quality team', 'quality employees', 'quality ke', 'quality wale'],      intent: 'department_users' },
  { keywords: ['production team', 'production employees', 'production ke'],             intent: 'department_users' },
  { keywords: ['procurement team', 'procurement employees'],                            intent: 'department_users' },
  { keywords: ['store team', 'store employees', 'warehouse team'],                      intent: 'department_users' },
  { keywords: ['dispatch team', 'dispatch employees', 'logistics team'],                intent: 'department_users' },
  { keywords: ['accounts team', 'accounts employees', 'finance team'],                  intent: 'department_users' },
  { keywords: ['management team', 'plant head team'],                                   intent: 'department_users' },
  { keywords: ['who is in'],                                                            intent: 'department_users' },
  // ── Site employees — override BEFORE generic 'ke employees' / 'mein kaun hai' ──
  { keywords: ['site ke employees', 'site mein kaun hai', 'site mein kaun kaun hai',
                'site assignment', 'site wise employees', 'site pe kaun assign hai', 'site ke log'],
    intent: 'site_employees' },
  { keywords: ['mein kaun hai', 'ke log', 'ke employees'],                              intent: 'department_users' },

  // ── Employee lookup — only when a specific name/ID is implied ──
  // 'employee details' removed: alone it means "list employees" → handled by users intent
  { keywords: ['find employee', 'search employee', 'employee ka detail', 'lookup employee', 'employee search'], intent: 'employee_lookup' },

  // ── Help & About ──
  { keywords: ['what can you', 'kya kar sakte', 'kya kya bata', 'help me', 'options', 'menu', 'commands', 'kya pooch'], intent: 'help' },
  { keywords: ['what is dynatech', 'dynatech kya', 'about this', 'ye application', 'about app'], intent: 'about' },

  // ── Customers (list) — BEFORE customer orders ──
  { keywords: ['all customers', 'show all customers', 'customer list', 'customers dikhao', 'kitne customers', 'how many customers', 'total customers', 'customer details'], intent: 'customers' },

  // ── Customer Orders ──
  { keywords: ['customer order', 'customer po', 'sales order', 'order book', 'customer orders dikhao', 'active orders', 'pending customer'], intent: 'customer_orders' },

  // ── RFQs ──
  { keywords: ['rfq', 'request for quotation', 'rfq list', 'rfq status', 'pending rfq'], intent: 'rfqs' },

  // ── Quotations ──
  { keywords: ['quotation', 'quote status', 'quotation list', 'quotation dikhao', 'pending quotation'], intent: 'quotations' },

  // ── Purchase Orders ──
  { keywords: ['purchase order', 'po list', 'po status', 'po dikhao', 'pending po', 'po stats', 'show po', 'po number'], intent: 'purchase_orders' },

  // ── SCARs ──
  { keywords: ['scar', 'supplier corrective', 'vendor scar'], intent: 'scars' },

  // ── Site inventory config — override BEFORE grns ('mrn' fuzzy-matches 'grn') and inventory ──
  { keywords: ['mrn to issue', 'mrn issue', 'mrn workflow', 'mrn setting', 'mrn se issue',
                'mrn to issue setting', 'mrn to issue enabled',
                'rack tracking', 'bundle tracking', 'alternate unit', 'alternate uom',
                'site inventory config', 'inventory tracking config', 'inventory tracking settings',
                'site tracking config', 'site tracking settings'],
    intent: 'site_inventory_config' },

  // ── Warehouse config — override BEFORE grns ('grn' token exact-matches) ──
  { keywords: ['warehouse grn prefix', 'warehouse grn format', 'grn prefix kya hai',
                'grn prefix setting', 'warehouse grn setting',
                'warehouse configuration', 'warehouse config', 'warehouse settings',
                'warehouse ki setting', 'godown configuration', 'godown config',
                'year basis', 'financial year basis', 'calendar year basis',
                'warehouse rack tracking', 'warehouse bundle tracking', 'warehouse costing'],
    intent: 'warehouse_config' },

  // ── GRNs ──
  { keywords: ['grn', 'goods receipt', 'material received', 'incoming material', 'grn dikhao', 'grn status', 'pending grn', 'aaj ka grn'], intent: 'grns' },

  // ── Material Requests ──
  { keywords: ['material request', 'material requisition', 'mr list', 'mr pending', 'material demand', 'material mangwana', 'store se material'], intent: 'material_requests' },

  // ── Issue Slips ──
  { keywords: ['issue slip', 'material issued', 'material issue', 'issue slip dikhao', 'kitna material issue'], intent: 'issue_slips' },

  // ── Inventory / Stock ──
  { keywords: ['stock adjustment', 'stock correction', 'inventory adjustment'], intent: 'stock_adjustments' },
  { keywords: ['inventory', 'stock level', 'stock summary', 'kitna stock', 'warehouse stock', 'stock dikhao', 'low stock', 'zero stock', 'godown mein'], intent: 'inventory' },

  // ── Maintenance: Equipment Master (/maintenance/equipment) ──
  { keywords: [
    'equipment master', 'equipment list', 'all equipment', 'equipment dikhao', 'equipment status',
    'show equipment', 'equipment count', 'how many equipment', 'total equipment',
    'equipment name', 'equipment code', 'equipment categories', 'equipment category',
    'critical equipment', 'criticality a', 'criticality b', 'criticality c',
    'operational equipment', 'under maintenance equipment', 'decommissioned equipment',
    'equipment hierarchy', 'plant equipment', 'factory equipment', 'manufacturing equipment',
    'sub assembly', 'component equipment', 'equipment registration', 'registered equipment',
    'equipment serial', 'manufacturer list', 'equipment manufacturer', 'equipment model',
    'equipment warranty', 'warranty expiry', 'equipment installed', 'installation date equipment',
    'equipment purchase date', 'equipment location', 'equipment department',
  ], intent: 'equipment' },

  // ── Maintenance: Health Dashboard (/maintenance/health) ──
  { keywords: [
    'health dashboard', 'equipment health', 'machine health', 'health score',
    'equipment health score', 'machine health score', 'health status', 'maintenance health',
    'health overview', 'equipment condition', 'health dashboard maintenance',
    'equipment health dashboard', 'critical health', 'healthy equipment', 'health report',
    'equipment performance health', 'plant health', 'asset health', 'health index',
  ], intent: 'maintenance_health' },

  // ── Maintenance: Spare Parts (/maintenance/spare-parts) ──
  { keywords: [
    'spare part', 'spare parts', 'spare part list', 'spare parts list', 'spare part dikhao',
    'spare part stock', 'spare part inventory', 'low stock spare', 'spare part cost',
    'maintenance spare', 'replacement parts', 'part stock', 'spare part count',
    'spare part code', 'spare parts available', 'spare part supplier',
    'kitne spare parts', 'spare parts ka stock', 'spare part khatam', 'spare part kharid',
    'spare part min stock', 'spare part reorder', 'part number maintenance',
  ], intent: 'spare_parts' },

  // ── Maintenance: Breakdowns (BEFORE work_orders — more specific) ──
  { keywords: ['breakdown request', 'breakdown list', 'machine breakdown', 'breakdown status', 'breakdown dikhao', 'kitne breakdowns', 'open breakdown', 'breakdown count', 'machine kharab', 'kharab machine', 'machine failure', 'pending breakdown'], intent: 'maintenance_breakdowns' },

  // ── Maintenance: Work Orders (BEFORE work_orders — more specific) ──
  { keywords: ['maintenance work order', 'maintenance wo', 'corrective work order', 'mwo list', 'mwo status', 'maintenance order', 'repair order', 'corrective order'], intent: 'maintenance_work_orders' },

  // ── Maintenance: PM Work Orders ──
  { keywords: ['pm work order', 'pm wo', 'preventive work order', 'pm order list', 'pm order status', 'pm kitni ho gayi', 'pm completed'], intent: 'pm_work_orders' },

  // ── Maintenance: PM Schedules ──
  { keywords: ['pm schedule', 'preventive maintenance schedule', 'upcoming pm', 'overdue pm', 'pm due', 'maintenance schedule', 'pm calendar', 'pm overdue'], intent: 'pm_schedules' },

  // ── Maintenance: LOTO ──
  { keywords: ['loto permit', 'lockout tagout', 'loto list', 'loto status', 'loto active', 'safety permit', 'loto dikhao'], intent: 'loto_permits' },

  // ── Maintenance: Downtime Logs (BEFORE downtime reasons) ──
  { keywords: ['downtime log', 'downtime entry', 'downtime hours', 'total downtime', 'machine downtime hour', 'kitne ghante downtime', 'unplanned downtime', 'planned downtime', 'machine bandi', 'downtime record'], intent: 'downtime_logs' },

  // ── Maintenance: Costs ──
  { keywords: ['maintenance cost', 'repair cost', 'maintenance kharcha', 'maintenance expense', 'maintenance budget', 'kitna kharcha maintenance'], intent: 'maintenance_costs' },

  // ── Maintenance: KPIs ──
  { keywords: ['maintenance kpi', 'mtbf', 'mttr', 'pm compliance', 'maintenance performance', 'maintenance metric', 'mean time', 'repair time', 'maintenance dashboard'], intent: 'maintenance_kpis' },

  // ── Mold ── (specific sub-pages first, then master overview)
  { keywords: ['mold cavity', 'cavity tracking', 'cavity status', 'cavity health', 'mold cavities',
                'blocked cavity', 'flagged cavity', 'damaged cavity', 'cavity count', 'active cavity',
                'cavity number', 'cavity blocked', 'cavity under repair'], intent: 'mold_cavities' },
  { keywords: ['mold store', 'mold storage', 'mold location', 'stored molds', 'mold warehouse',
                'mold in storage', 'mold available', 'mold store dashboard', 'mold godown',
                'mold kahan hai', 'where is mold', 'mold inventory location'], intent: 'mold_store' },
  { keywords: ['mold pm', 'mold pm schedule', 'mold preventive maintenance', 'mold maintenance schedule',
                'mold pm overdue', 'mold pm pending', 'mold service schedule', 'mold pm due',
                'mold pm completed', 'mold maintenance due', 'mold service due'], intent: 'mold_pm' },
  { keywords: ['mold repair', 'mold damage', 'mold repair request', 'mold repair status',
                'damaged mold', 'mold sent for repair', 'mold repair cost', 'mold repair urgency',
                'mold repair in progress', 'mold repair vendor', 'mold external repair',
                'mold repair open', 'mold repair completed'], intent: 'mold_repair' },
  { keywords: ['mold trial', 'trial run', 'mold test run', 'trial result', 'mold passed',
                'mold failed trial', 'new mold trial', 'post repair trial', 'mold approval trial',
                'trial shots', 'trial ok qty', 'mold trial status', 'mold trial report',
                'mold production ready', 'trial pending'], intent: 'mold_trials' },
  { keywords: ['mold cost', 'mold investment', 'mold expense', 'mold total cost', 'mold cost tracking',
                'mold purchase cost', 'mold repair cost tracking', 'mold cost analysis',
                'mold cost type', 'mold cost history', 'total mold investment'], intent: 'mold_cost' },
  { keywords: ['mold document', 'mold documents', 'mold spec', 'mold specification',
                'mold certificate', 'mold drawing', 'mold document list', 'mold files',
                'mold design document', 'mold technical document', 'mold blueprint'], intent: 'mold_documents' },
  { keywords: ['mold list', 'mould list', 'mold master', 'mold status', 'mold dikhao', 'kitne molds', 'mold inventory', 'molds dikhao',
                'mold code', 'mold name', 'mold category', 'mold serial', 'mold manufacturer',
                'mold weight', 'mold tonnage', 'mold cavities count', 'expected life shots',
                'mold owner', 'customer mold', 'mold in production', 'mold decommissioned',
                'mold nfc', 'mold qr', 'mold register', 'new mold'], intent: 'molds' },
  { keywords: ['mold shot', 'shot count', 'mold shots', 'shots liye', 'shot history', 'mold life percentage', 'mold ne kitne shots',
                'cumulative shots', 'shot log', 'shot summary', 'production shots', 'shot count per mold'], intent: 'mold_shot_count' },
  { keywords: ['mold life', 'mold alert', 'mold eol', 'mold replacement', 'mold life alert', 'mold expiry', 'mold khatam', 'near end of life',
                'mold life stage', 'urgent replacement', 'plan replacement', 'critical mold', 'extended life mold'], intent: 'mold_life_alerts' },
  { keywords: ['mold issue', 'mold return', 'mold issued', 'mold diya', 'mold wapas', 'mold transaction', 'mold kaun le gaya',
                'mold issue return', 'mold handover', 'mold issued to machine', 'mold verification'], intent: 'mold_issue_return' },

  // ── Work Orders (production — after maintenance to avoid shadowing) ──
  { keywords: ['name all work orders', 'name all the work orders', 'list work orders', 'list all work orders', 'show all work orders', 'all work orders', 'name work orders'], intent: 'work_orders' },
  { keywords: ['work order', 'production order', 'wo status', 'wo list', 'pending work order', 'active work order', 'today production', 'aaj ka production', 'production plan'], intent: 'work_orders' },

  // ── Job Cards ──
  { keywords: ['job card', 'job cards', 'job card status', 'job card dikhao'], intent: 'job_cards' },

  // ── Scrap ──
  { keywords: ['scrap voucher', 'scrap report', 'scrap list', 'kitna scrap', 'rejection scrap', 'scrap dikhao', 'scrap quantity'], intent: 'scrap_vouchers' },

  // ── Downtime Reasons (master data — after downtime_logs) ──
  { keywords: ['downtime reason', 'downtime causes', 'breakdown reason', 'downtime code', 'reason for downtime'], intent: 'downtime' },

  // ── Jobwork / Subcontract Challans ──
  { keywords: ['jobwork', 'subcontract', 'outward challan', 'challan list', 'challan status', 'challan dikhao', 'pending challan', 'current jobwork', 'material sent for jobwork', 'kitne challan pending'], intent: 'subcontract_challans' },

  // ── Dispatch Orders ──
  { keywords: ['dispatch order', 'dispatch list', 'dispatch status', 'pending dispatch', 'shipping order', 'ready for dispatch', 'dispatch dikhao', 'aaj ka dispatch', 'delivery order'], intent: 'dispatch_orders' },

  // ── Delivery Challans ──
  { keywords: ['delivery challan', 'dc list', 'dc status', 'delivery challan dikhao'], intent: 'delivery_challans' },

  // ── IQC Inspections ──
  { keywords: ['iqc', 'incoming quality', 'incoming inspection', 'iqc inspection', 'iqc list', 'iqc status', 'iqc pass', 'iqc fail', 'iqc result', 'iqc pending', 'iqc rejection', 'iqc dikhao'], intent: 'iqc_inspections' },

  // ── LQC Inspections ──
  { keywords: ['lqc', 'line quality', 'line inspection', 'lqc inspection', 'lqc list', 'lqc status', 'lqc result', 'lqc dikhao'], intent: 'lqc_inspections' },

  // ── PQC Inspections ──
  { keywords: ['pqc', 'process quality', 'packing inspection', 'pqc inspection', 'pqc list', 'pqc status', 'pqc result', 'pqc dikhao'], intent: 'pqc_inspections' },

  // ── OQC Inspections ──
  { keywords: ['oqc', 'outgoing quality', 'final inspection', 'oqc inspection', 'oqc list', 'oqc status', 'oqc result', 'oqc dikhao'], intent: 'oqc_inspections' },

  // ── Complaints ──
  { keywords: ['complaint', 'customer complaint', 'complaints dikhao', 'pending complaint', 'complaint summary', 'open complaint', 'complaint status', 'customer ne complaint'], intent: 'complaints' },

  // ── NCRs ──
  { keywords: ['ncr', 'non conformance', 'ncr list', 'ncr status', 'ncr dikhao', 'pending ncr', 'open ncr', 'rejection report'], intent: 'ncrs' },

  // ── CAPAs ──
  { keywords: ['capa', 'corrective action', 'preventive action', 'capa list', 'capa status', 'open capa', 'pending capa', 'capa effectiveness'], intent: 'capas' },

  // ── Instruments / Calibration ──
  { keywords: ['instrument', 'calibration', 'gauge', 'measuring instrument', 'calibration due', 'overdue calibration', 'calibration status', 'calibration pending'], intent: 'instruments' },

  // ── Drawings ──
  { keywords: ['drawing', 'engineering drawing', 'drawing list', 'drawing status', 'drawing approval', 'drawing revision', 'npd drawing', 'drawings dikhao'], intent: 'drawings' },

  // ── PFMEA ──
  { keywords: ['pfmea', 'fmea', 'process fmea', 'failure mode', 'high rpn', 'pfmea dikhao'], intent: 'pfmeas' },

  // ── BOM ──
  { keywords: ['bom', 'bill of material', 'bom list', 'bom status', 'bom dikhao'], intent: 'boms' },

  // ── Sales Invoices ──
  { keywords: ['sales invoice', 'invoice list', 'invoice status', 'pending invoice', 'invoice amount', 'billing summary', 'invoice dikhao', 'total billing', 'tally sync'], intent: 'sales_invoices' },

  // ── Payments ──
  { keywords: ['payment list', 'pending payment', 'payment status', 'payment summary', 'payments dikhao', 'kitne payment'], intent: 'payments' },

  // ── Debit/Credit Notes ──
  { keywords: ['debit note', 'credit note', 'dcn list', 'debit credit', 'debit notes dikhao'], intent: 'debit_credit_notes' },

  // ── COPQ ──
  { keywords: ['copq', 'cost of poor quality', 'quality cost', 'rejection cost', 'poor quality cost'], intent: 'copq' },

  // ── Training ──
  { keywords: ['training', 'training record', 'pending training', 'training status', 'employee training', 'training dikhao'], intent: 'training' },

  // ── Transporters ──
  { keywords: ['transporter', 'logistics partner', 'transport compan', 'transporter dikhao'], intent: 'transporters' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── SITES MODULE — all sub-sections (most specific FIRST) ────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Site Contact & Identity — email, GSTIN, addresses ──
  // (BEFORE generic "site" rules to prevent shadowing)
  { keywords: [
    // GSTIN
    'site ka gstin', 'site gstin', 'gstin of site', 'gstin number', 'site gst number',
    'gst number of plant', 'plant ka gstin', 'company gstin', 'tax number site',
    'gstin kya hai', 'site ka tax number', 'gst kya hai site ka',
    // Email
    'site email', 'site ka email', 'plant email', 'plant ka email',
    'site ki email id', 'site contact email',
    // Address
    'site ka address', 'site address', 'plant address', 'plant ka address',
    'invoice address', 'shipping address', 'site invoice address',
    'billing address site', 'delivery address site',
    'site ki location', 'plant ki location',
    // Combined contact
    'site contact details', 'site contact info', 'plant contact', 'site identity',
    'site details contact', 'site ki jankari contact',
  ], intent: 'site_contact' },

  // ── Site Production & Planning Config — machine scheduling, lock window, PO approval ──
  { keywords: [
    // Machine scheduling
    'machine scheduling', 'machine scheduling enabled', 'is machine scheduling on',
    'machine scheduling status', 'scheduling enabled', 'machine scheduler',
    'machine scheduling kya hai', 'scheduling on hai', 'machine scheduling off',
    'kaunse site mein machine scheduling on hai',
    // Production edit lock
    'edit lock', 'production lock', 'production edit lock', 'edit lock window',
    'lock window', 'production locked', 'edit time lock', 'kitne ghante lock',
    'production lock time', 'edit kab lock hota hai',
    // PO approval
    'manual po approval', 'po approval setting', 'po approval enabled',
    'is po approval manual', 'automatic po approval', 'po approval kya hai',
    'po manual approval', 'po approve automatically',
    // Combined
    'production config', 'production settings', 'planning config',
    'site production settings', 'production configuration', 'site planning config',
    'production aur planning setting', 'site ki production setting',
  ], intent: 'site_config' },

  // ── Site Nomenclature — PO prefix/format, dispatch prefix/format ──
  { keywords: [
    // PO nomenclature
    'po prefix', 'po number format', 'po format', 'purchase order prefix',
    'po prefix kya hai', 'po number kaise banta', 'po series',
    'po year format', 'po separator', 'po numbering',
    // Dispatch nomenclature
    'dispatch prefix', 'dispatch number format', 'dispatch format',
    'dispatch prefix kya hai', 'dispatch number kaise banta', 'dispatch series',
    'dispatch year format', 'dispatch separator',
    // Combined / generic
    'nomenclature', 'document number format', 'number series', 'number format',
    'document numbering', 'auto number format', 'numbering format',
    'site ka po format', 'site ki nomenclature', 'document prefix',
    'nomenclature setting', 'prefix setting', 'series format',
    'po aur dispatch format', 'document series',
  ], intent: 'site_nomenclature' },

  // ── Site Inventory & Tracking Config — mrn_to_issue, rack_tracking, bundle, alternate_unit ──
  { keywords: [
    // Rack tracking
    'rack tracking', 'rack tracking enabled', 'is rack tracking on',
    'rack tracking status', 'rack se material', 'rack location tracking',
    'rack tracking kya hai', 'rack tracking on hai',
    // Bundle tracking
    'bundle tracking', 'bundle tracking enabled', 'bundle tracking on',
    'bundle tracking kya hai',
    // MRN to Issue — multi-token phrases only ('mrn' alone fuzzy-matches 'grn')
    'mrn to issue setting', 'mrn to issue enabled', 'mrn to issue on hai',
    'mrn issue workflow', 'mrn issue setting', 'mrn se direct issue',
    'material request issue setting', 'mrn se material issue',
    // Alternate unit
    'alternate unit', 'alternate uom', 'alternate unit enabled',
    'dual unit', 'secondary unit', 'alternate unit on hai',
    // Combined — site-scoped phrases only ('inventory config' alone matches inventory intent)
    'site inventory config', 'site inventory settings',
    'inventory tracking config', 'inventory tracking settings',
    'site tracking config', 'site tracking settings',
    'site ki inventory setting', 'inventory tracking on hai',
    'site mein rack tracking hai', 'godown tracking setting',
  ], intent: 'site_inventory_config' },

  // ── Site Costing Config — costing_calculation ──
  { keywords: [
    // Single-token bare keyword — catches typos like "coasting" via fuzzy match (dist 1)
    'costing',
    // Costing enabled
    'costing enabled', 'costing calculation enabled', 'is costing on',
    'costing on hai', 'costing calculation on', 'costing kahan enabled hai',
    'site mein costing on hai', 'costing calculation kahan on hai',
    // Costing disabled
    'costing disabled', 'costing off hai',
    // Settings
    'costing setting', 'costing configuration', 'site ka costing setting',
    'site costing config', 'overhead calculation', 'overhead calculation enabled',
    'cost calculation enabled', 'cost config', 'costing flag',
    // Page references
    'costing page', 'costing section', 'costing dashboard',
    'site ka costing', 'site costing',
  ], intent: 'site_costing_config' },

  // ── Site Maintenance Config — downtime_template ──
  { keywords: [
    // Downtime template
    'downtime template', 'downtime format', 'downtime entry format',
    'downtime template kya hai', 'downtime record format',
    'how is downtime recorded', 'downtime entry kaise hota hai',
    'downtime se kaise log karte', 'duration instances',
    'from to time downtime', 'from duration template',
    // Combined
    'maintenance template', 'maintenance config', 'maintenance setting',
    'site maintenance config', 'site ka maintenance setting',
    'maintenance configuration', 'downtime config',
    'site ka downtime format', 'maintenance template setting',
  ], intent: 'site_maintenance_config' },

  // ── Site Employees — users assigned via user_sites ──
  { keywords: [
    // English — avoid 'plant ke employees' (shadows department_users 'ke employees' rule)
    'site employees', 'site ke employees', 'plant employees',
    'employees at site', 'staff at plant', 'who works at plant', 'who is at site',
    'employees assigned to site', 'site staff', 'plant staff',
    'site wise employees', 'plant wise employees', 'employees per site',
    'site mein kaun hai', 'plant mein kaun hai', 'site mein kaun kaun hai',
    'plant mein kaun kaun hai',
    // Assignment
    'site assignment', 'user site assignment', 'employees assigned',
    'site pe kaun assign hai', 'plant assignment',
    // Count
    'how many employees at site', 'site mein kitne employees', 'plant mein kitne log',
    // Specific site name hints
    'dtc site employees', 'plant ke log', 'site ke log',
  ], intent: 'site_employees' },

  // ── Sites overview (after all sub-sections) ──
  { keywords: [
    // List & count
    'site list', 'all sites', 'show all sites', 'list all sites', 'show sites',
    'sites dikhao', 'site dikhao', 'total sites', 'how many sites', 'kitne sites',
    'sites ki list', 'site count', 'sites ki ginti',
    // Plant / facility synonyms
    'plant list', 'all plants', 'show plants', 'list plants', 'plants dikhao',
    'manufacturing plants', 'production plants', 'plant locations',
    'facility list', 'all facilities', 'company locations', 'company sites',
    'our plants', 'our sites', 'plants ke naam', 'sites ke naam',
    // Active / status
    'active sites', 'inactive sites', 'active plants', 'site status', 'plant status',
    'kaunsa site active', 'kaunsa plant active',
    // Overview / general
    'site information', 'plant information', 'plants ki jankari',
    'site list do', 'plants list do',
  ], intent: 'sites' },

  // ── Shifts (global — not site-specific) ──
  { keywords: [
    // List
    'shift list', 'all shifts', 'shifts dikhao', 'shift dikhao',
    'show shifts', 'list shifts', 'shifts ki list', 'total shifts',
    'how many shifts', 'kitne shifts', 'shift count',
    // Timings
    'shift timing', 'shift time', 'shift schedule', 'work shift',
    'shift start time', 'shift end time', 'shift hours',
    'shift kab se kab tak', 'shift ka time', 'shift duration',
    // Specific shifts
    'day shift', 'night shift', 'morning shift', 'evening shift',
    'day shift timing', 'night shift timing', 'morning shift time',
    // Break
    'lunch break', 'shift break', 'break duration', 'break time',
    // Working hours
    'working hours', 'plant working hours', 'office hours', 'work hours',
    'kaun si shift hai', 'shifts kitne hain', 'shift ka naam',
    // Hinglish
    'active shifts', 'shift ki jankari',
  ], intent: 'shifts' },

  // ── Warehouse Configuration (detailed settings) ──
  { keywords: [
    // Config-specific keywords
    'warehouse configuration', 'warehouse config', 'warehouse settings',
    'warehouse ki setting', 'godown configuration', 'godown config',
    // GRN settings — 'grn prefix' alone matches grns intent; use qualified phrases only
    'warehouse grn prefix', 'grn prefix kya hai', 'grn prefix setting',
    'warehouse grn format', 'warehouse grn setting',
    'year basis', 'financial year basis', 'calendar year basis',
    'grn year basis', 'warehouse year basis',
    // Tracking toggles
    'warehouse rack tracking', 'warehouse bundle tracking',
    'warehouse mrn to issue', 'warehouse costing',
    'costing in warehouse', 'rack in warehouse',
    // Combined
    'warehouse detailed settings', 'godown settings',
  ], intent: 'warehouse_config' },

  // ── Warehouses overview ──
  { keywords: [
    'warehouse list', 'all warehouses', 'show warehouses', 'list warehouses',
    'warehouse dikhao', 'warehouses dikhao', 'total warehouses',
    'how many warehouses', 'kitne warehouses', 'warehouses ki list', 'warehouse count',
    'godown list', 'godown dikhao', 'all godowns', 'kitne godowns',
    'store location', 'store locations', 'storage locations', 'all stores',
    'inventory location', 'material store',
    'active warehouses', 'inactive warehouses', 'warehouse status',
    'warehouse details', 'warehouse information', 'warehouse ka naam',
    'site ke warehouses', 'plant ke godowns', 'site mein kitne warehouses',
    'raw material store', 'finished goods store', 'finished goods warehouse',
    'godown mein', 'warehouses ki jankari',
  ], intent: 'warehouses' },

  // ── Integrations (Tally, Zoho, SAP) ──
  { keywords: [
    // Generic
    'integration list', 'all integrations', 'integrations dikhao',
    'show integrations', 'integration status', 'integrations ki list',
    'third party integration', 'api integration', 'software integration',
    'erp integration', 'connected software', 'external integration',
    'kaunse integrations hain', 'integrations ka status',
    // Tally
    'tally integration', 'tally connected', 'tally enabled', 'tally status',
    'tally sync status', 'is tally connected', 'tally erp', 'tally on hai',
    'tally off hai', 'tally ka status', 'accounting software tally',
    // Zoho
    'zoho integration', 'zoho connected', 'zoho enabled', 'zoho status',
    'is zoho connected', 'zoho crm', 'zoho books', 'zoho on hai',
    'zoho ka status',
    // SAP
    'sap integration', 'sap connected', 'sap enabled', 'sap status',
    'is sap connected', 'sap erp', 'sap on hai', 'sap ka status',
    // Last test
    'integration test', 'last integration test', 'connection test',
    'integration test status', 'integration connection status',
    'kaunsa integration connected hai',
  ], intent: 'integrations' },

  // ── Basic data intents (catchall) ──
  { keywords: ['role list', 'roles dikhao', 'show role', 'all roles'],                    intent: 'roles' },
  { keywords: ['department list', 'departments dikhao', 'show department', 'dept list'],   intent: 'departments' },
  { keywords: ['vendor list', 'vendor dikhao', 'list all vendor', 'all suppliers', 'all vendor', 'supplier list', 'jobwork vendor', 'partner list'], intent: 'vendors' },
  { keywords: ['item list', 'items dikhao', 'show item', 'raw material', 'finished good', 'mro item'], intent: 'items' },
  { keywords: ['machine list', 'machines dikhao', 'show machine', 'machine master',
                'machine name', 'machine code', 'machine type', 'machine capacity',
                'all machines', 'total machines', 'active machines', 'machine details'],  intent: 'machines' },
];

// ── Fuzzy Keyword Matching ────────────────────────────────────────────────────
// Enhancement 7: handles typos (Levenshtein ≤1 for 5+ char tokens),
// word-order independence, and synonym variations.

function normalizeStr(s) {
  return s.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Check if a single keyword token matches any token in the input
function tokenFuzzyMatch(kwToken, inputTokens) {
  if (inputTokens.includes(kwToken)) return true;
  // Allow 1 edit-distance typo for words ≥3 chars (catches "dall"→"all", "ordr"→"order", etc.)
  if (kwToken.length >= 3) {
    return inputTokens.some((it) => it.length >= 3 && natural.LevenshteinDistance(kwToken, it) <= 1);
  }
  return false;
}

// Returns true if ≥75% of the keyword phrase's tokens are found in the input
function fuzzyPhraseMatch(kwPhrase, normalizedInput, inputTokens) {
  // Fast path: exact substring match
  if (normalizedInput.includes(kwPhrase)) return true;
  const kwTokens = kwPhrase.split(' ').filter(Boolean);
  if (kwTokens.length === 0) return false;
  const matched = kwTokens.filter((kt) => tokenFuzzyMatch(kt, inputTokens)).length;
  return matched / kwTokens.length >= 0.85;
}

function keywordMatch(input) {
  const normalized = normalizeStr(input);
  const inputTokens = normalized.split(' ').filter(Boolean);
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (fuzzyPhraseMatch(normalizeStr(kw), normalized, inputTokens)) return rule.intent;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Context Query Detection ──────────────────────────────────────────────────
// Catches "what was the name of the employee I just asked about", "who did I
// ask last", "pichle mein kiska pucha" etc. — answered from session memory.
const CONTEXT_QUERY_PATTERNS = [
  /what\s+was\s+the\s+name(?:\s+of\s+(?:the\s+)?(?:employee|person))?/i,
  /who\s+(?:was|did)\s+(?:i\s+)?(?:just\s+)?ask(?:ed)?\s*(?:about)?/i,
  /what\s+(?:was\s+)?(?:the\s+)?(?:last|previous)\s+(?:employee|person|name)/i,
  /(?:last|previous)\s+(?:employee|person)\s+(?:i\s+)?(?:asked|searched|queried|looked\s+up)/i,
  /name\s+of\s+(?:the\s+)?(?:employee|person)\s+(?:i\s+)?(?:just\s+)?asked/i,
  /who\s+did\s+i\s+just\s+(?:look\s+up|search\s+for|ask\s+about|enquire\s+about)/i,
  /pichle\s+(?:(?:message\s+)?mein\s+)?(?:kiska|kaun(?:sa)?)\s*(?:ke\s+baare\s+mein\s+)?(?:pucha|puchha|search\s+kiya|dekha)/i,
  /(?:woh|jo)\s+(?:employee|person|naam)\s+(?:pichle|last|jo\s+abhi)/i,
  /kaun\s+tha\s+(?:woh|pichla|last\s+wala)/i,
  /just\s+asked\s+about\s+(?:which|what|who)/i,
  /(?:i\s+)?just\s+(?:searched|looked\s+up|asked\s+about)\s+(?:an?\s+)?employee/i,
  /jo\s+(?:abhi|just)\s+(?:pucha|puchha|search\s+kiya)/i,
];

function detectContextQuery(input) {
  return CONTEXT_QUERY_PATTERNS.some((re) => re.test(input));
}

// ── Main: processMessage ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @param {string} message     — user's input text
 * @param {object} models      — Sequelize models from require('../../models')
 * @param {object} [context]   — optional { role, page, sessionId }
 * @returns {Promise<string>}  — response text
 */
async function processMessage(message, models, context = {}) {
  if (!message || !message.trim()) return randomPick(STATIC_RESPONSES.unknown);

  const input     = message.trim().toLowerCase();
  const { sessionId } = context;
  const session   = sessionId ? getSession(sessionId) : {};

  // ── Helper: run a data-handler with given options and persist session ───────
  async function runHandler(intent, opts = {}) {
    const ENTITY_INTENTS = ['department_users', 'employee_lookup'];
    const secondArg = ENTITY_INTENTS.includes(intent) ? input : opts;
    const response  = await DATA_HANDLERS[intent](models, secondArg);
    if (sessionId) {
      setSession(sessionId, { lastIntent: intent, lastFilters: opts, lastOffset: opts.offset || 0 });
    }
    const route = INTENT_TO_ROUTE[intent];
    return route ? `${response}\n\n[Is page par dekhein →](${route})` : response;
  }

  // ── 0. Entity query pre-check (runs before everything else) ────────────────
  // Catches "Vikram ka department", "who is Rajesh", "PO-2024-003 ka status"
  // — queries that name a specific person or document number.

  // 0a. Document number lookup (WO-xxx, PO-xxx, GRN-xxx, etc.)
  const docMatch = input.match(DOC_NUMBER_REGEX);
  if (docMatch) {
    try {
      const resp = await resolveDocumentQuery(models, docMatch[0].toUpperCase());
      if (sessionId) setSession(sessionId, { lastIntent: 'doc_lookup', lastFilters: {}, lastOffset: 0 });
      return resp;
    } catch (err) {
      console.error('[nlp-chatbot] doc lookup error:', err.message);
    }
  }

  // 0b. Person-entity question ("Vikram is from which department", "who is Priya", etc.)
  const personQuery = detectPersonQuery(input);
  if (personQuery) {
    try {
      const resp = await resolvePersonQuery(models, personQuery.name, personQuery.type);
      // Extract the resolved employee name for context memory.
      // Single-match: response starts with **Full Name** — grab first bold non-numeric token.
      // Multi-match: response has **N** employees — skip the count, fall back to searched name.
      // Not-found: no bold text at all — preserve previous lastResolvedName (don't overwrite).
      const notFound = resp.includes('naam ka koi employee nahi mila');
      if (sessionId) {
        if (notFound) {
          // Keep lastResolvedName from previous query; just update lastIntent
          setSession(sessionId, {
            ...session,
            lastIntent:    'employee_lookup',
            lastFilters:   {},
            lastOffset:    0,
          });
        } else {
          const boldTokens = [...resp.matchAll(/\*\*([^*\n(]+)\*\*/g)].map((m) => m[1].trim());
          const resolvedName = boldTokens.find((s) => !/^\d+$/.test(s)) ?? personQuery.name;
          setSession(sessionId, {
            ...session,
            lastIntent:       'employee_lookup',
            lastFilters:      {},
            lastOffset:       0,
            lastResolvedName: resolvedName,
            lastQueryType:    personQuery.type,
          });
        }
      }
      return `${resp}\n\n[Employees page par dekhein →](/masters/employees)`;
    } catch (err) {
      console.error('[nlp-chatbot] person query error:', err.message);
    }
  }

  // 0c. Conversation context query — user asks about the last person they looked up
  // e.g. "what was the name of the employee I just asked about", "who did I ask last"
  if (session.lastResolvedName && detectContextQuery(input)) {
    return `Aapne pichle message mein **${session.lastResolvedName}** ke baare mein pucha tha.`;
  }

  // ── 1. Follow-up detection (only when a previous intent exists in session) ──
  if (session.lastIntent && DATA_HANDLERS[session.lastIntent]) {
    const followup = detectFollowup(input);
    if (followup) {
      let opts = {};
      if (followup === 'more') {
        opts = { ...session.lastFilters, offset: (session.lastOffset || 0) + 5 };
      } else if (followup === 'repeat') {
        opts = session.lastFilters || {};
      } else if (['today', 'week', 'month'].includes(followup)) {
        opts = buildDateFilter(followup);
      }
      try {
        return await runHandler(session.lastIntent, opts);
      } catch (err) {
        console.error(`[nlp-chatbot] Follow-up error (${session.lastIntent}):`, err.message);
        return 'Maaf karna, data laane mein problem aa gayi. Thodi der baad try karo.';
      }
    }
  }

  // ── 2. Keyword match (high confidence, fuzzy) ───────────────────────────────
  let intent = keywordMatch(input);

  // ── 3. Bayes fallback ───────────────────────────────────────────────────────
  if (!intent) {
    const classifications = classifier.getClassifications(input);
    if (classifications.length > 0) intent = classifications[0].label;
  }

  if (!intent) return randomPick(STATIC_RESPONSES.unknown);

  // ── 4. Static response (greeting, goodbye, etc.) ────────────────────────────
  if (STATIC_RESPONSES[intent] && !DATA_HANDLERS[intent]) {
    return randomPick(STATIC_RESPONSES[intent]);
  }

  // ── 5. Dynamic data fetch ───────────────────────────────────────────────────
  if (DATA_HANDLERS[intent]) {
    // Check if the message itself contains an embedded date filter
    const embeddedDate = detectFollowup(input);
    const opts = (['today', 'week', 'month'].includes(embeddedDate)) ? buildDateFilter(embeddedDate) : {};
    try {
      return await runHandler(intent, opts);
    } catch (err) {
      console.error(`[nlp-chatbot] Error fetching ${intent}:`, err.message);
      return `Maaf karna, ${intent} ka data laane mein problem aa rahi hai. Thodi der baad try karo.`;
    }
  }

  return randomPick(STATIC_RESPONSES.unknown);
}

module.exports = { processMessage };
