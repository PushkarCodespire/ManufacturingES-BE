-- Dynatech ONE — Insert seed users into deployed DB (non-destructive)
-- Default password: Dynatech@123
-- Run via: psql -h <host> -U <user> -d <db> -f seed-users-only.sql
-- Or paste into any SQL client (pgAdmin, DBeaver, Supabase SQL Editor, etc.)

BEGIN;

-- Step 1: Departments (skip if exists)
INSERT INTO departments (code, name, "createdAt", "updatedAt") VALUES
  ('10', 'Management',  NOW(), NOW()),
  ('11', 'Quality',     NOW(), NOW()),
  ('12', 'Procurement', NOW(), NOW()),
  ('13', 'Store',       NOW(), NOW()),
  ('14', 'Production',  NOW(), NOW()),
  ('15', 'Dispatch',    NOW(), NOW()),
  ('16', 'Accounts',    NOW(), NOW()),
  ('17', 'HR',          NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Step 2: Roles (skip if exists)
INSERT INTO roles (name, label, department_id, "createdAt", "updatedAt") VALUES
  ('plant_head',           'Plant Head',            (SELECT id FROM departments WHERE code='10'), NOW(), NOW()),
  ('it_admin',             'IT Admin',              (SELECT id FROM departments WHERE code='10'), NOW(), NOW()),
  ('qa_manager',           'QA Manager',            (SELECT id FROM departments WHERE code='11'), NOW(), NOW()),
  ('npd_engineer',         'NPD Engineer',          (SELECT id FROM departments WHERE code='11'), NOW(), NOW()),
  ('iqc_inspector',        'IQC Inspector',         (SELECT id FROM departments WHERE code='11'), NOW(), NOW()),
  ('lqc_inspector',        'LQC Inspector',         (SELECT id FROM departments WHERE code='11'), NOW(), NOW()),
  ('pqc_inspector',        'PQC Inspector',         (SELECT id FROM departments WHERE code='11'), NOW(), NOW()),
  ('oqc_inspector',        'OQC Inspector',         (SELECT id FROM departments WHERE code='11'), NOW(), NOW()),
  ('procurement_manager',  'Procurement Manager',   (SELECT id FROM departments WHERE code='12'), NOW(), NOW()),
  ('store_manager',        'Store Manager',         (SELECT id FROM departments WHERE code='13'), NOW(), NOW()),
  ('production_planner',   'Production Planner',    (SELECT id FROM departments WHERE code='14'), NOW(), NOW()),
  ('production_supervisor','Production Supervisor',  (SELECT id FROM departments WHERE code='14'), NOW(), NOW()),
  ('operator',             'Operator',              (SELECT id FROM departments WHERE code='14'), NOW(), NOW()),
  ('dispatch_manager',     'Dispatch Manager',      (SELECT id FROM departments WHERE code='15'), NOW(), NOW()),
  ('accounts_manager',     'Accounts Manager',      (SELECT id FROM departments WHERE code='16'), NOW(), NOW()),
  ('hr_admin',             'HR Admin',              (SELECT id FROM departments WHERE code='17'), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Step 3: Users (skip if exists)
-- Password: Dynatech@123
INSERT INTO users (employee_id, name, email, phone, password_hash, role_id, department_id, is_first_login, is_active, "createdAt", "updatedAt") VALUES
  ('DT10001', 'Rajesh Kumar',     'plant.head@dynatech.com',  '9876500001', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='plant_head'),           (SELECT id FROM departments WHERE code='10'), false, true, NOW(), NOW()),
  ('DT10002', 'Amit Sharma',      'it.admin@dynatech.com',    '9876500002', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='it_admin'),             (SELECT id FROM departments WHERE code='10'), false, true, NOW(), NOW()),
  ('DT11001', 'Priya Singh',      'qa.manager@dynatech.com',  '9876500003', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='qa_manager'),           (SELECT id FROM departments WHERE code='11'), false, true, NOW(), NOW()),
  ('DT11002', 'Vikram Patel',     'npd@dynatech.com',         '9876500004', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='npd_engineer'),         (SELECT id FROM departments WHERE code='11'), false, true, NOW(), NOW()),
  ('DT11003', 'Sunita Verma',     'iqc@dynatech.com',         '9876500005', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='iqc_inspector'),        (SELECT id FROM departments WHERE code='11'), false, true, NOW(), NOW()),
  ('DT11004', 'Ravi Gupta',       'lqc@dynatech.com',         '9876500006', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='lqc_inspector'),        (SELECT id FROM departments WHERE code='11'), false, true, NOW(), NOW()),
  ('DT11005', 'Meena Joshi',      'pqc@dynatech.com',         '9876500007', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='pqc_inspector'),        (SELECT id FROM departments WHERE code='11'), false, true, NOW(), NOW()),
  ('DT11006', 'Anil Tiwari',      'oqc@dynatech.com',         '9876500008', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='oqc_inspector'),        (SELECT id FROM departments WHERE code='11'), false, true, NOW(), NOW()),
  ('DT12001', 'Suresh Yadav',     'procurement@dynatech.com', '9876500009', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='procurement_manager'),  (SELECT id FROM departments WHERE code='12'), false, true, NOW(), NOW()),
  ('DT13001', 'Deepak Mishra',    'store@dynatech.com',       '9876500010', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='store_manager'),        (SELECT id FROM departments WHERE code='13'), false, true, NOW(), NOW()),
  ('DT14001', 'Kiran Reddy',      'planner@dynatech.com',     '9876500011', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='production_planner'),   (SELECT id FROM departments WHERE code='14'), false, true, NOW(), NOW()),
  ('DT14002', 'Manoj Patil',      'supervisor@dynatech.com',  '9876500012', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='production_supervisor'),(SELECT id FROM departments WHERE code='14'), false, true, NOW(), NOW()),
  ('DT14003', 'Ramesh Chauhan',   'operator@dynatech.com',    '9876500013', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='operator'),             (SELECT id FROM departments WHERE code='14'), false, true, NOW(), NOW()),
  ('DT15001', 'Geeta Nair',       'dispatch@dynatech.com',    '9876500014', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='dispatch_manager'),     (SELECT id FROM departments WHERE code='15'), false, true, NOW(), NOW()),
  ('DT16001', 'Santosh Kulkarni', 'accounts@dynatech.com',    '9876500015', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='accounts_manager'),     (SELECT id FROM departments WHERE code='16'), false, true, NOW(), NOW()),
  ('DT17001', 'Pooja Mehta',      'hr@dynatech.com',          '9876500016', '$2a$10$FwDH3YSr3AfRxmvmf1RPeOHtV4nm7povVotlFR7aHvDF7rEec6OKq', (SELECT id FROM roles WHERE name='hr_admin'),             (SELECT id FROM departments WHERE code='17'), false, true, NOW(), NOW())
ON CONFLICT (employee_id) DO NOTHING;

COMMIT;

-- Verify
SELECT employee_id, name, r.label as role FROM users u JOIN roles r ON u.role_id = r.id ORDER BY employee_id;
