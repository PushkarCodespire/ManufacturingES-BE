'use strict';

const natural = require('natural');
const { Op } = require('sequelize');

// ── Classifier ──────────────────────────────────────────────────────────────
const classifier = new natural.BayesClassifier();

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

async function fetchUsers(models) {
  const totalUsers = await models.User.count();
  const activeUsers = await models.User.count({ where: { is_active: true } });
  const byDept = await models.User.findAll({
    attributes: ['department_id', [models.sequelize.fn('COUNT', models.sequelize.col('User.id')), 'count']],
    include: [{ model: models.Department, attributes: ['name'] }],
    group: ['department_id', 'Department.id'],
    raw: true, nest: true,
  });
  const deptLines = byDept.map((d) => `- ${d.Department?.name || 'Unknown'}: ${d.count}`);
  return `**Users Summary:**
- Total: **${totalUsers}**
- Active: **${activeUsers}**
- Inactive: **${totalUsers - activeUsers}**

**Department-wise:**
${deptLines.join('\n')}`;
}

async function fetchDepartmentUsers(models, input) {
  const deptAlias = extractDepartment(input);
  if (!deptAlias) return 'Konsa department? Ye try karo: "HR team", "quality employees", "production team", "store team", etc.';
  const dept = await models.Department.findOne({ where: { name: { [Op.iLike]: deptAlias.search } }, raw: true });
  if (!dept) return `"${deptAlias.search.replace(/%/g, '')}" department nahi mila. "departments" type karo.`;
  const users = await models.User.findAll({
    where: { department_id: dept.id, is_active: true },
    include: [{ model: models.Role, attributes: ['label'] }],
    attributes: ['name', 'email', 'phone', 'employee_id'],
    order: [['name', 'ASC']], raw: true, nest: true,
  });
  if (!users.length) return `**${dept.name}** mein koi active employee nahi hai abhi.`;
  const lines = users.map((u) => {
    const parts = [`**${u.name}**`];
    if (u.Role?.label) parts.push(`(${u.Role.label})`);
    if (u.email) parts.push(`| ${u.email}`);
    if (u.phone) parts.push(`| ${u.phone}`);
    return `- ${parts.join(' ')}`;
  });
  return `**${dept.name} — ${users.length} Employee(s):**\n${lines.join('\n')}`;
}

async function fetchEmployeeLookup(models, input) {
  const fillers = ['find', 'search', 'show', 'details', 'of', 'employee', 'user', 'ka', 'ke', 'ki', 'kaun', 'hai', 'ye', 'the', 'dikhao', 'batao'];
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
    include: [{ model: models.Item, attributes: ['name'] }],
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
    attributes: [[models.sequelize.fn('SUM', models.sequelize.col('payment_amount')), 'total']],
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
    attributes: ['cost_category', [models.sequelize.fn('SUM', models.sequelize.col('cost_amount')), 'total']],
    group: ['cost_category'], raw: true,
  });
  const catLines = byCategory.map((c) => `- ${c.cost_category}: **₹${Math.round(c.total || 0).toLocaleString()}**`);

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
  // Masters
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
};

// ── Pick random from array ──────────────────────────────────────────────────
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Keyword-based pre-check ─────────────────────────────────────────────────
// ORDER MATTERS — first match wins. More specific rules go first.
// ══════════════════════════════════════════════════════════════════════════════
const KEYWORD_RULES = [
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
  { keywords: ['mein kaun hai', 'ke log', 'ke employees'],                              intent: 'department_users' },

  // ── Employee lookup ──
  { keywords: ['find employee', 'search employee', 'employee details', 'employee ka detail'], intent: 'employee_lookup' },

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

  // ── GRNs ──
  { keywords: ['grn', 'goods receipt', 'material received', 'incoming material', 'grn dikhao', 'grn status', 'pending grn', 'aaj ka grn'], intent: 'grns' },

  // ── Material Requests ──
  { keywords: ['material request', 'material requisition', 'mr list', 'mr pending', 'material demand', 'material mangwana', 'store se material'], intent: 'material_requests' },

  // ── Issue Slips ──
  { keywords: ['issue slip', 'material issued', 'material issue', 'issue slip dikhao', 'kitna material issue'], intent: 'issue_slips' },

  // ── Inventory / Stock ──
  { keywords: ['stock adjustment', 'stock correction', 'inventory adjustment'], intent: 'stock_adjustments' },
  { keywords: ['inventory', 'stock level', 'stock summary', 'kitna stock', 'warehouse stock', 'stock dikhao', 'low stock', 'zero stock', 'godown mein'], intent: 'inventory' },

  // ── Work Orders ──
  { keywords: ['work order', 'production order', 'wo status', 'wo list', 'pending work order', 'active work order', 'today production', 'aaj ka production', 'production plan'], intent: 'work_orders' },

  // ── Job Cards ──
  { keywords: ['job card', 'job cards', 'job card status', 'job card dikhao'], intent: 'job_cards' },

  // ── Scrap ──
  { keywords: ['scrap voucher', 'scrap report', 'scrap list', 'kitna scrap', 'rejection scrap', 'scrap dikhao', 'scrap quantity'], intent: 'scrap_vouchers' },

  // ── Downtime ──
  { keywords: ['downtime', 'machine downtime', 'breakdown', 'machine breakdown', 'downtime reason'], intent: 'downtime' },

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

  // ── Basic data intents (catchall) ──
  { keywords: ['role list', 'roles dikhao', 'show role', 'all roles'],                    intent: 'roles' },
  { keywords: ['department list', 'departments dikhao', 'show department', 'dept list'],   intent: 'departments' },
  { keywords: ['vendor list', 'vendor dikhao', 'list all vendor', 'all suppliers', 'all vendor', 'supplier list', 'jobwork vendor', 'partner list'], intent: 'vendors' },
  { keywords: ['item list', 'items dikhao', 'show item', 'raw material', 'finished good', 'mro item'], intent: 'items' },
  { keywords: ['machine list', 'machines dikhao', 'show machine', 'equipment list'],      intent: 'machines' },
];

function keywordMatch(input) {
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (input.includes(kw)) return rule.intent;
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main: processMessage ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @param {string} message — user's input text
 * @param {object} models — Sequelize models from require('../../models')
 * @param {object} [context] — optional { role, page }
 * @returns {Promise<string>} — response text
 */
async function processMessage(message, models, context = {}) {
  if (!message || !message.trim()) {
    return randomPick(STATIC_RESPONSES.unknown);
  }

  const input = message.trim().toLowerCase();

  // 1. Try keyword-based matching first (high confidence)
  let intent = keywordMatch(input);

  // 2. Fall back to Bayes classifier
  if (!intent) {
    const classifications = classifier.getClassifications(input);
    intent = classifications[0].label;
  }

  // If it's a static response intent
  if (STATIC_RESPONSES[intent] && !DATA_HANDLERS[intent]) {
    return randomPick(STATIC_RESPONSES[intent]);
  }

  // If it's a data-fetching intent
  if (DATA_HANDLERS[intent]) {
    try {
      // department_users and employee_lookup need the raw input for entity extraction
      if (intent === 'department_users' || intent === 'employee_lookup') {
        return await DATA_HANDLERS[intent](models, input);
      }
      return await DATA_HANDLERS[intent](models);
    } catch (err) {
      console.error(`[nlp-chatbot] Error fetching ${intent}:`, err.message);
      return `Maaf karna, ${intent} ka data fetch karne mein problem aa rahi hai. Thodi der baad try karo.`;
    }
  }

  // Unknown intent
  return randomPick(STATIC_RESPONSES.unknown);
}

module.exports = { processMessage };
