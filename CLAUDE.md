# Dynatech ONE — Backend CLAUDE.md
> Rules for Claude Code to follow when building backend features.

---

## NEW FEATURE CHECKLIST — FOLLOW THIS ORDER

When building a new backend module/feature, complete **all steps** in order:

### Step 1: Create the Model
- File: `backend/modules/{module}/model/MyModel.js`
- Define Sequelize model with proper data types
- Register in `backend/models/index.js` with associations

### Step 2: Create Migration
- Run: `npm run migration:create -- AddMyTable`
- Edit the migration file with `up()` and `down()` methods
- **Never** use `sequelize.sync({ force: true })` in production

### Step 3: Create Validation Schema
- File: `backend/modules/{module}/cred/my.cred.js`
- Use Joi 17 for all input validation
- Export named validation functions: `validateCreateSchema`, `validateUpdateSchema`

### Step 4: Create Controller
- File: `backend/modules/{module}/controller/my.controller.js`
- Follow the standard controller pattern (see below)
- Always validate input first, then business logic, then return standard response

### Step 5: Create Routes
- File: `backend/routes/my.routes.js`
- **Always** use `authenticate` middleware on protected routes
- **Always** use `authorize(...roles)` for role-restricted endpoints
- Register in `backend/routes/index.js`

### Step 6: Add Swagger Docs
- File: `backend/config/swagger.js`
- Add schema definitions under `components.schemas`
- Add path definitions under `paths`
- Document which roles are allowed

### Step 7: Coordinate with Frontend
- Tell the frontend developer which API endpoints are available
- Confirm the response structure matches `{ success: true, data: ... }`
- The frontend will handle feature-level permissions — backend only does role-level

---

## PERMISSION SYSTEM — MANDATORY

User permissions are stored as a flat JSON array in `users.permissions` (JSONB).
The backend enforces **role-level** access (plant_head, it_admin, etc.) via the `authorize()` middleware.
**Feature-level** permissions (read/write/download per module) are stored in `users.permissions` and enforced on the **frontend** by the `<Can>` component and `usePermissions` hook.

### Do NOT check feature-level permissions in controllers
Feature-level keys like `sites-configuration-read` are enforced on the frontend.
The backend only enforces **role-based** access via `authorize()` middleware.

### Permission key format (for reference)
```
{parentKey}-{label_slug}-{permType_slug}
```
Examples: `sites-configuration-read`, `store-requests-material_request-create_edit_delete`

These keys are defined in the frontend's `EmployeeDetail.jsx` tree data and stored in `users.permissions` JSONB field.

---

## AUTHENTICATION & AUTHORIZATION MIDDLEWARE

| Middleware | File | Usage |
|-----------|------|-------|
| `authenticate` | `config/middleware.js` | Verifies JWT, attaches `req.user` |
| `authorize(...roles)` | `config/middleware.js` | Checks `req.user.Role.name` against allowed roles |

### Always use both for protected routes
```js
router.post('/resource', authenticate, authorize('plant_head', 'it_admin'), controller);
```

### Public routes (no middleware)
```js
router.post('/auth/login',   login);
router.post('/auth/refresh', refresh);
```

### Available roles
| Role name | Description |
|-----------|-------------|
| `plant_head` | Full admin access (bypasses all permission checks) |
| `it_admin` | Full admin access (bypasses all permission checks) |
| `store_manager` | Store department head |
| `store_incharge` | Store operations |
| `production_manager` | Production department head |
| `production_incharge` | Production operations |
| `quality_manager` | Quality department head |
| `quality_incharge` | Quality operations |
| `planning_manager` | Planning department head |
| `planning_incharge` | Planning operations |
| `procurement_manager` | Procurement department head |
| `dispatch_manager` | Dispatch department head |
| `accounts_manager` | Accounts department head |
| `hr_manager` | HR department head |
| `operator` | Shop floor operator |
| `viewer` | Read-only access |

### Route authorization patterns

```js
// Admin-only routes (most restrictive)
router.post('/admin/reset-password', authenticate, authorize('plant_head', 'it_admin'), controller);

// Department-level routes (specific roles)
router.get('/store/grn', authenticate, authorize('plant_head', 'it_admin', 'store_manager', 'store_incharge'), controller);

// Open to all authenticated users (no authorize middleware)
router.get('/dashboard', authenticate, controller);
```

---

## USER PERMISSIONS FIELD

### Model: `users.permissions`
- Type: `JSONB`, default `[]`
- Flat array of permission key strings assigned via Employee Detail > Access Tabs
- Updated via `PATCH /api/users/:id` with `{ permissions: [...] }` body
- Included automatically in all User queries (no special join needed)

### Example stored value
```json
[
  "sites",
  "sites-configuration",
  "sites-configuration-read",
  "store-requests",
  "store-requests-material_request",
  "store-requests-material_request-read",
  "prod-dpr",
  "prod-dpr-daily_production_report",
  "prod-dpr-daily_production_report-create_edit_delete"
]
```

### Validation (user.cred.js)
`permissions` is allowed in `updateUserSchema` as `Joi.array().items(Joi.string())`.
It is a scalar field — handled by `user.update(scalarFields)` in `updateUser` controller.

---

## RESPONSE STRUCTURE

All API responses must follow this format:

```js
// Success
res.json({ success: true, data: result });
res.status(201).json({ success: true, message: '...', data: result });

// Error
res.status(400).json({ success: false, message: 'Validation error details' });
res.status(401).json({ success: false, message: 'Unauthorized' });
res.status(403).json({ success: false, message: 'Forbidden' });
res.status(404).json({ success: false, message: 'Resource not found' });
res.status(500).json({ success: false, message: 'Server error' });
```

**Never change this structure** — the frontend axios interceptor and `<Can>` system depend on `success: true/false`.

---

## CONTROLLER PATTERN

```js
const myController = async (req, res) => {
  try {
    // 1. Validate input (Joi schema in cred/ file)
    const { error, value } = validateMySchema(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // 2. Business logic + DB operations

    // 3. Return success
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[myController]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

---

## SEQUELIZE PATTERNS

### Standard user fetch (always use this include set)
```js
const user = await User.findByPk(id, {
  attributes: { exclude: ['password_hash'] },
  include: [
    { model: Role,       attributes: ['id', 'name', 'label'] },
    { model: Department, attributes: ['id', 'code', 'name'] },
    { model: Site,       attributes: ['id', 'name', 'code'], through: { attributes: [] } },
    { model: Warehouse,  attributes: ['id', 'name', 'code'], through: { attributes: [] } },
  ],
});
```
The `permissions` field is a scalar — it is included automatically (not excluded).

### Many-to-many updates
```js
if (site_ids !== undefined)      await user.setSites(site_ids ?? []);
if (warehouse_ids !== undefined) await user.setWarehouses(warehouse_ids ?? []);
```

### Schema changes -> always add a migration
**Never** use `sequelize.sync({ force: true })` in production.
Run: `npm run migration:create -- AddMyColumn` -> edit the migration -> restart server.

---

## ROUTE FILE STRUCTURE

```
routes/
  index.js          <- aggregates all routers at /api
  auth.routes.js    <- /api/auth/*
  user.routes.js    <- /api/users/*
  site.routes.js    <- /api/sites/*
  shift.routes.js   <- /api/shifts/*
  audit.routes.js   <- /api/audit/*
  notification.routes.js <- /api/notifications/*
```

When adding a new module:
1. Create `backend/modules/{module}/model/MyModel.js`
2. Create `backend/modules/{module}/controller/my.controller.js`
3. Create `backend/modules/{module}/cred/my.cred.js` (Joi schemas)
4. Create `backend/routes/my.routes.js`
5. Register in `backend/routes/index.js`
6. Register model + associations in `backend/models/index.js`
7. Add migration for new tables/columns
8. **Add Swagger docs** in `backend/config/swagger.js`

---

## SECURITY RULES

- **Never return `password_hash`** in any response — always `attributes: { exclude: ['password_hash'] }`
- **Always authenticate** protected routes — never expose user data without JWT
- **Role check before any write** — use `authorize('plant_head', 'it_admin')` pattern
- **Validate all inputs** with Joi before touching the DB
- **Audit sensitive actions** (login, password change, password reset) via AuditLog model

---

## SWAGGER DOCS — MANDATORY

When adding a new API endpoint, **always add it to `backend/config/swagger.js`**:
- Add schema definitions under `components.schemas`
- Add path definition under `paths`
- Include correct `tags`, `security`, `requestBody`, and all `responses` (200/400/401/403/404/500)
- Document which roles are allowed in the `description` field

---

## TECH STACK

- **Framework:** Express.js 4.x
- **ORM:** Sequelize 6 + PostgreSQL (pg)
- **Validation:** Joi 17
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Migrations:** Umzug (auto-run on server start)
- **Docs:** swagger-ui-express at `/api-docs`
