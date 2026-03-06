/**
 * Dynatech ONE — Database Seeder
 * Seeds: 8 Departments, 16 Roles, 16 Users (one per role)
 *
 * Run: npm run seed
 * Default password for all users: Dynatech@123
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, Department, Role, User } = require('../models');
const { DEPARTMENTS, ROLES } = require('../config/constants');

const SEED_USERS = [
  // Dept 10 — Management
  { employee_id: 'DT10001', name: 'Rajesh Kumar',    email: 'plant.head@dynatech.com',   phone: '9876500001', role: 'plant_head' },
  { employee_id: 'DT10002', name: 'Amit Sharma',     email: 'it.admin@dynatech.com',      phone: '9876500002', role: 'it_admin' },
  // Dept 11 — Quality
  { employee_id: 'DT11001', name: 'Priya Singh',     email: 'qa.manager@dynatech.com',    phone: '9876500003', role: 'qa_manager' },
  { employee_id: 'DT11002', name: 'Vikram Patel',    email: 'npd@dynatech.com',           phone: '9876500004', role: 'npd_engineer' },
  { employee_id: 'DT11003', name: 'Sunita Verma',    email: 'iqc@dynatech.com',           phone: '9876500005', role: 'iqc_inspector' },
  { employee_id: 'DT11004', name: 'Ravi Gupta',      email: 'lqc@dynatech.com',           phone: '9876500006', role: 'lqc_inspector' },
  { employee_id: 'DT11005', name: 'Meena Joshi',     email: 'pqc@dynatech.com',           phone: '9876500007', role: 'pqc_inspector' },
  { employee_id: 'DT11006', name: 'Anil Tiwari',     email: 'oqc@dynatech.com',           phone: '9876500008', role: 'oqc_inspector' },
  // Dept 12 — Procurement
  { employee_id: 'DT12001', name: 'Suresh Yadav',    email: 'procurement@dynatech.com',   phone: '9876500009', role: 'procurement_manager' },
  // Dept 13 — Store
  { employee_id: 'DT13001', name: 'Deepak Mishra',   email: 'store@dynatech.com',         phone: '9876500010', role: 'store_manager' },
  // Dept 14 — Production
  { employee_id: 'DT14001', name: 'Kiran Reddy',     email: 'planner@dynatech.com',       phone: '9876500011', role: 'production_planner' },
  { employee_id: 'DT14002', name: 'Manoj Patil',     email: 'supervisor@dynatech.com',    phone: '9876500012', role: 'production_supervisor' },
  { employee_id: 'DT14003', name: 'Ramesh Chauhan',  email: 'operator@dynatech.com',      phone: '9876500013', role: 'operator' },
  // Dept 15 — Dispatch
  { employee_id: 'DT15001', name: 'Geeta Nair',      email: 'dispatch@dynatech.com',      phone: '9876500014', role: 'dispatch_manager' },
  // Dept 16 — Accounts
  { employee_id: 'DT16001', name: 'Santosh Kulkarni',email: 'accounts@dynatech.com',      phone: '9876500015', role: 'accounts_manager' },
  // Dept 17 — HR
  { employee_id: 'DT17001', name: 'Pooja Mehta',     email: 'hr@dynatech.com',            phone: '9876500016', role: 'hr_admin' },
];

async function seed() {
  try {
    console.log('🌱 Starting Dynatech ONE seed...\n');

    await sequelize.authenticate();
    console.log('✅ DB connected');

    // Drop & recreate all tables
    await sequelize.sync({ force: true });
    console.log('✅ Tables reset\n');

    // ── Step 1: Departments ──────────────────────────────────────────────────
    const deptMap = {}; // code → id
    for (const d of DEPARTMENTS) {
      const dept = await Department.create({ code: d.code, name: d.name });
      deptMap[d.code] = dept.id;
      console.log(`  Dept ${d.code} — ${d.name}`);
    }
    console.log(`\n✅ ${DEPARTMENTS.length} Departments seeded\n`);

    // ── Step 2: Roles ────────────────────────────────────────────────────────
    const roleMap = {}; // name → { id, dept_id }
    for (const r of ROLES) {
      const role = await Role.create({
        name: r.name,
        label: r.label,
        department_id: deptMap[r.dept_code],
      });
      roleMap[r.name] = { id: role.id, dept_id: deptMap[r.dept_code] };
      console.log(`  ${r.label} (Dept ${r.dept_code})`);
    }
    console.log(`\n✅ ${ROLES.length} Roles seeded\n`);

    // ── Step 3: Users ────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Dynatech@123', 10);

    for (const u of SEED_USERS) {
      await User.create({
        employee_id: u.employee_id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        password_hash: passwordHash,
        role_id: roleMap[u.role].id,
        department_id: roleMap[u.role].dept_id,
        is_first_login: true,
        is_active: true,
      });
      console.log(`  ${u.employee_id} — ${u.name} [${u.role}]`);
    }
    console.log(`\n✅ ${SEED_USERS.length} Users seeded\n`);

    console.log('─'.repeat(50));
    console.log('🎉 Seeding complete!');
    console.log('   Default password: Dynatech@123');
    console.log('   All users flagged as first_login → must change password on first login');
    console.log('─'.repeat(50));

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
