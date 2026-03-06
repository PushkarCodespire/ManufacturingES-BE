/**
 * Dynatech ONE — Centralized Constants
 * Source: dynatech_one_masterplan.docx
 */

const DEPARTMENTS = [
  { code: 10, name: 'Management / Plant Head' },
  { code: 11, name: 'Quality' },
  { code: 12, name: 'Procurement' },
  { code: 13, name: 'Store / Warehouse' },
  { code: 14, name: 'Production / Manufacturing' },
  { code: 15, name: 'Dispatch / Logistics' },
  { code: 16, name: 'Accounts / Finance' },
  { code: 17, name: 'HR / Admin' },
];

// 16 roles as per dynatech_one_features.xlsx
const ROLES = [
  { name: 'plant_head',            label: 'Plant Head',            dept_code: 10 },
  { name: 'it_admin',              label: 'IT Admin',              dept_code: 10 },
  { name: 'qa_manager',            label: 'QA Manager',            dept_code: 11 },
  { name: 'npd_engineer',          label: 'NPD Engineer',          dept_code: 11 },
  { name: 'iqc_inspector',         label: 'IQC Inspector',         dept_code: 11 },
  { name: 'lqc_inspector',         label: 'LQC Inspector',         dept_code: 11 },
  { name: 'pqc_inspector',         label: 'PQC Inspector',         dept_code: 11 },
  { name: 'oqc_inspector',         label: 'OQC Inspector',         dept_code: 11 },
  { name: 'procurement_manager',   label: 'Procurement Manager',   dept_code: 12 },
  { name: 'store_manager',         label: 'Store Manager',         dept_code: 13 },
  { name: 'production_planner',    label: 'Production Planner',    dept_code: 14 },
  { name: 'production_supervisor', label: 'Production Supervisor', dept_code: 14 },
  { name: 'operator',              label: 'Operator',              dept_code: 14 },
  { name: 'dispatch_manager',      label: 'Dispatch Manager',      dept_code: 15 },
  { name: 'accounts_manager',      label: 'Accounts Manager',      dept_code: 16 },
  { name: 'hr_admin',              label: 'HR Admin',              dept_code: 17 },
];

// SYS-001: Max 5 failed attempts → 15-min lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// SYS-004: Auto-logout after 8 hours inactivity
const SESSION_EXPIRES_HOURS = 8;

// SYS-002: Min 8 chars, 1 uppercase, 1 number
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

module.exports = {
  DEPARTMENTS,
  ROLES,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  SESSION_EXPIRES_HOURS,
  PASSWORD_REGEX,
};
