/**
 * Production-safe seeder — does NOT drop/recreate tables.
 * Uses findOrCreate so it is fully idempotent (safe to run multiple times).
 * Called automatically when SEED_ON_START=true env var is set.
 */
const bcrypt = require('bcryptjs');
const {
  sequelize, Department, Role, User,
  MaintenancePriority, EquipmentCategory, MntDowntimeReason,
} = require('../models');
const { DEPARTMENTS, ROLES } = require('../config/constants');

const SEED_USERS = [
  { employee_id: 'DT10001', name: 'Rajesh Kumar',     email: 'plant.head@dynatech.com',   phone: '9876500001', role: 'plant_head' },
  { employee_id: 'DT10002', name: 'Amit Sharma',      email: 'it.admin@dynatech.com',      phone: '9876500002', role: 'it_admin' },
  { employee_id: 'DT11001', name: 'Priya Singh',      email: 'qa.manager@dynatech.com',    phone: '9876500003', role: 'qa_manager' },
  { employee_id: 'DT11002', name: 'Vikram Patel',     email: 'npd@dynatech.com',           phone: '9876500004', role: 'npd_engineer' },
  { employee_id: 'DT11003', name: 'Sunita Verma',     email: 'iqc@dynatech.com',           phone: '9876500005', role: 'iqc_inspector' },
  { employee_id: 'DT11004', name: 'Ravi Gupta',       email: 'lqc@dynatech.com',           phone: '9876500006', role: 'lqc_inspector' },
  { employee_id: 'DT11005', name: 'Meena Joshi',      email: 'pqc@dynatech.com',           phone: '9876500007', role: 'pqc_inspector' },
  { employee_id: 'DT11006', name: 'Anil Tiwari',      email: 'oqc@dynatech.com',           phone: '9876500008', role: 'oqc_inspector' },
  { employee_id: 'DT12001', name: 'Suresh Yadav',     email: 'procurement@dynatech.com',   phone: '9876500009', role: 'procurement_manager' },
  { employee_id: 'DT13001', name: 'Deepak Mishra',    email: 'store@dynatech.com',         phone: '9876500010', role: 'store_manager' },
  { employee_id: 'DT14001', name: 'Kiran Reddy',      email: 'planner@dynatech.com',       phone: '9876500011', role: 'production_planner' },
  { employee_id: 'DT14002', name: 'Manoj Patil',      email: 'supervisor@dynatech.com',    phone: '9876500012', role: 'production_supervisor' },
  { employee_id: 'DT14003', name: 'Ramesh Chauhan',   email: 'operator@dynatech.com',      phone: '9876500013', role: 'operator' },
  { employee_id: 'DT15001', name: 'Geeta Nair',       email: 'dispatch@dynatech.com',      phone: '9876500014', role: 'dispatch_manager' },
  { employee_id: 'DT16001', name: 'Santosh Kulkarni', email: 'accounts@dynatech.com',      phone: '9876500015', role: 'accounts_manager' },
  { employee_id: 'DT17001', name: 'Pooja Mehta',      email: 'hr@dynatech.com',            phone: '9876500016', role: 'hr_admin' },
];

async function seedProduction() {
  console.log('\n🌱 Running production seed (idempotent)...\n');

  const passwordHash = await bcrypt.hash('Dynatech@123', 10);

  // ── Departments ──────────────────────────────────────────────────────────────
  const deptMap = {};
  for (const d of DEPARTMENTS) {
    const [dept] = await Department.findOrCreate({
      where: { code: d.code },
      defaults: { name: d.name },
    });
    deptMap[d.code] = dept.id;
  }
  console.log(`✅ ${DEPARTMENTS.length} Departments ready`);

  // ── Roles ────────────────────────────────────────────────────────────────────
  const roleMap = {};
  for (const r of ROLES) {
    const [role] = await Role.findOrCreate({
      where: { name: r.name },
      defaults: { label: r.label, department_id: deptMap[r.dept_code] },
    });
    roleMap[r.name] = { id: role.id, dept_id: deptMap[r.dept_code] };
  }
  console.log(`✅ ${ROLES.length} Roles ready`);

  // ── Users ────────────────────────────────────────────────────────────────────
  for (const u of SEED_USERS) {
    await User.findOrCreate({
      where: { employee_id: u.employee_id },
      defaults: {
        name:          u.name,
        email:         u.email,
        phone:         u.phone,
        password_hash: passwordHash,
        role_id:       roleMap[u.role].id,
        department_id: roleMap[u.role].dept_id,
        is_first_login: true,
        is_active:      true,
      },
    });
  }
  console.log(`✅ ${SEED_USERS.length} Users ready`);

  // ── Maintenance Priorities ────────────────────────────────────────────────────
  const PRIORITIES = [
    { name: 'P1 — Critical', response_time_minutes: 15,   color_code: '#dc2626', description: 'Immediate response — production stopped',    is_active: true },
    { name: 'P2 — High',     response_time_minutes: 60,   color_code: '#d97706', description: 'Urgent — significant production impact',     is_active: true },
    { name: 'P3 — Medium',   response_time_minutes: 240,  color_code: '#ca8a04', description: 'Normal — partial or potential impact',       is_active: true },
    { name: 'P4 — Low',      response_time_minutes: 1440, color_code: '#2563eb', description: 'Scheduled — no immediate production impact', is_active: true },
  ];
  for (const p of PRIORITIES) {
    await MaintenancePriority.findOrCreate({ where: { name: p.name }, defaults: p });
  }
  console.log(`✅ ${PRIORITIES.length} Maintenance Priorities ready`);

  // ── Equipment Categories ──────────────────────────────────────────────────────
  const EQUIP_CATEGORIES = [
    { name: 'Injection Moulding',        default_criticality: 'A', is_active: true },
    { name: 'CNC Machining',             default_criticality: 'A', is_active: true },
    { name: 'Welding',                   default_criticality: 'B', is_active: true },
    { name: 'Conveyor / Material Handling', default_criticality: 'B', is_active: true },
    { name: 'Compressors & Utilities',   default_criticality: 'B', is_active: true },
    { name: 'Assembly Tools',            default_criticality: 'C', is_active: true },
    { name: 'Inspection / Testing',      default_criticality: 'B', is_active: true },
    { name: 'General',                   default_criticality: 'C', is_active: true },
  ];
  for (const c of EQUIP_CATEGORIES) {
    await EquipmentCategory.findOrCreate({ where: { name: c.name }, defaults: c });
  }
  console.log(`✅ ${EQUIP_CATEGORIES.length} Equipment Categories ready`);

  // ── Downtime Reasons ──────────────────────────────────────────────────────────
  const DOWNTIME_REASONS = [
    { name: 'Preventive Maintenance',    category: 'planned_pm',   is_active: true },
    { name: 'Scheduled Inspection',      category: 'planned_pm',   is_active: true },
    { name: 'Machine Breakdown',         category: 'breakdown',    is_active: true },
    { name: 'Electrical Fault',          category: 'breakdown',    is_active: true },
    { name: 'Hydraulic Failure',         category: 'breakdown',    is_active: true },
    { name: 'Tooling Failure',           category: 'breakdown',    is_active: true },
    { name: 'Mould / Die Changeover',    category: 'changeover',   is_active: true },
    { name: 'Product Changeover',        category: 'changeover',   is_active: true },
    { name: 'Material Not Available',    category: 'no_material',  is_active: true },
    { name: 'Raw Material Shortage',     category: 'no_material',  is_active: true },
    { name: 'Operator Absent',           category: 'no_operator',  is_active: true },
    { name: 'Operator Training',         category: 'no_operator',  is_active: true },
    { name: 'Quality Hold — Inspection', category: 'quality_hold', is_active: true },
    { name: 'Quality Hold — Rework',     category: 'quality_hold', is_active: true },
    { name: 'Power Failure',             category: 'other',        is_active: true },
    { name: 'Utility Failure',           category: 'other',        is_active: true },
    { name: 'Other / Unknown',           category: 'other',        is_active: true },
  ];
  for (const r of DOWNTIME_REASONS) {
    await MntDowntimeReason.findOrCreate({ where: { name: r.name }, defaults: r });
  }
  console.log(`✅ ${DOWNTIME_REASONS.length} Downtime Reasons ready`);

  console.log('\n🎉 Seed complete! Login: DT10002 / Dynatech@123\n');
}

module.exports = { seedProduction };
