'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  Dynatech ONE — OpenAPI 3.0 Specification
// ─────────────────────────────────────────────────────────────────────────────

const swaggerSpec = {
  openapi: '3.0.3',

  info: {
    title:       'Dynatech ONE — API',
    version:     '1.0.0',
    description: [
      '## Factory Operations Platform',
      'Full-lifecycle ERP/MES/QMS for manufacturing.',
      '',
      '**Flow:** Customer PO → Planning → Procurement → IQC → Store → Production → PQC → OQC → Dispatch',
      '',
      '### Authentication',
      'Protected endpoints require a **Bearer JWT** token.',
      '',
      'Steps:',
      '1. Call `POST /api/auth/login` with `employee_id` + `password`',
      '2. Copy the `token` from the response',
      '3. Click **Authorize** (🔒) at the top of this page and paste: `<your_token>`',
    ].join('\n'),
    contact: { name: 'Dynatech ONE Dev Team' },
  },

  servers: [
    { url: 'http://localhost:5000', description: 'Local Development' },
  ],

  tags: [
    { name: 'Health',        description: 'Server health check' },
    { name: 'Auth',          description: 'Authentication & password management (SYS-001 – SYS-004)' },
    { name: 'Users',         description: 'Employee CRUD & lookup dropdowns' },
    { name: 'Sites',         description: 'Site / factory configuration (Masters)' },
    { name: 'Shifts',        description: 'Shift management (Masters)' },
    { name: 'Audit',                description: 'Audit log & activity trail (SYS-007)' },
    { name: 'Notifications',        description: 'In-app notification bell' },
    { name: 'Warehouses',           description: 'Warehouse / storage location management (Masters)' },
    { name: 'Machines',             description: 'Production equipment & hierarchy (Masters)' },
    { name: 'Items',                description: 'Parts / materials master (Masters)' },
    { name: 'ProductionParameters', description: 'QC & production parameters (Masters)' },
    { name: 'RFQs',                description: 'Request for Quotation — Procurement' },
    { name: 'Quotations',          description: 'Vendor Quotations — Procurement' },
    { name: 'CustomerOrders',      description: 'Customer Purchase Orders — Orders' },
    { name: 'PurchaseOrders',      description: 'Purchase Orders to Vendors — Procurement' },
    { name: 'GRNs',                description: 'Goods Receipt Notes — Store' },
    { name: 'MaterialRequests',    description: 'Material Issue Requests — Store' },
    { name: 'IssueSlips',          description: 'Material Issue Slips — Store' },
    { name: 'StockAdjustments',    description: 'Stock Adjustment Vouchers — Store' },
    { name: 'WorkOrders',          description: 'Production Work Orders — Production' },
    { name: 'JobCards',            description: 'Job Cards — Production' },
    { name: 'LqcInspections',      description: 'Line Quality Control Inspections — Production' },
    { name: 'ProductionSchedules', description: 'Production Schedules — Planning' },
    { name: 'ScrapVouchers',       description: 'Scrap Vouchers — Production' },
    { name: 'SubcontractChallans', description: 'Subcontracting Challans (Outward / Inward)' },
    { name: 'Capa',        description: 'CAPA / 8D Process (QS-001)' },
    { name: 'Ncr',         description: 'Internal NCR with cost tracking (QS-007)' },
    { name: 'Complaints',  description: 'Customer Complaints & 8D response (QS-009)' },
    { name: 'Drawings',    description: 'Drawing & Document Control (NPD-001)' },
    { name: 'CheckSheets', description: 'Check-Sheet Builder (NPD-002)' },
    { name: 'Pfmea',       description: 'Process FMEA / AIAG-VDA (NPD-003)' },
  ],

  // ── Security ──────────────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'Paste the JWT access token received from POST /api/auth/login',
      },
    },

    // ── Reusable Schemas ────────────────────────────────────────────────────
    schemas: {

      // ── Generic ───────────────────────────────────────────────────────────
      SuccessMessage: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string',  example: 'Operation successful' },
        },
      },
      Error400: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'Validation error: name is required' },
        },
      },
      Error401: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'Unauthorized — token missing or expired' },
        },
      },
      Error403: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'Forbidden — insufficient role' },
        },
      },
      Error404: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'Resource not found' },
        },
      },
      Error500: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'Internal Server Error' },
        },
      },

      // ── Lookup objects ────────────────────────────────────────────────────
      Department: {
        type: 'object',
        properties: {
          id:   { type: 'integer', example: 1 },
          name: { type: 'string',  example: 'Quality' },
          code: { type: 'integer', example: 11 },
        },
      },
      Role: {
        type: 'object',
        properties: {
          id:            { type: 'integer', example: 3 },
          name:          { type: 'string',  example: 'qa_manager' },
          label:         { type: 'string',  example: 'QA Manager' },
          department_id: { type: 'integer', example: 1 },
        },
      },
      SiteShort: {
        type: 'object',
        properties: {
          id:   { type: 'integer', example: 1 },
          name: { type: 'string',  example: 'Main Plant' },
          code: { type: 'string',  example: 'MP' },
        },
      },
      WarehouseShort: {
        type: 'object',
        properties: {
          id:   { type: 'integer', example: 1 },
          name: { type: 'string',  example: 'Raw Material Store' },
          code: { type: 'string',  example: 'RMS' },
        },
      },

      // ── Auth ──────────────────────────────────────────────────────────────
      LoginRequest: {
        type:     'object',
        required: ['employee_id', 'password'],
        properties: {
          employee_id: { type: 'string', example: 'DT1001' },
          password:    { type: 'string', format: 'password', example: 'Admin@123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success:       { type: 'boolean', example: true },
          token:         { type: 'string',  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          refresh_token: { type: 'string',  example: 'a3f9c2d1...' },
          is_first_login:{ type: 'boolean', example: false },
          user: { $ref: '#/components/schemas/UserResponse' },
        },
      },
      RefreshRequest: {
        type:     'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string', example: 'a3f9c2d1...' },
        },
      },
      RefreshResponse: {
        type: 'object',
        properties: {
          success:       { type: 'boolean', example: true },
          token:         { type: 'string',  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          refresh_token: { type: 'string',  example: 'b7e1a9d3...' },
        },
      },
      ChangePasswordRequest: {
        type:     'object',
        required: ['current_password', 'new_password'],
        properties: {
          current_password: { type: 'string', format: 'password', example: 'OldPass@1' },
          new_password:     {
            type: 'string', format: 'password', example: 'NewPass@2',
            description: 'Min 8 chars, at least 1 uppercase letter and 1 number',
          },
        },
      },
      AdminResetPasswordRequest: {
        type:     'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'integer', example: 5 },
        },
      },
      AdminResetPasswordResponse: {
        type: 'object',
        properties: {
          success:      { type: 'boolean', example: true },
          temp_password:{ type: 'string',  example: 'Temp@a3f9c21' },
          employee_id:  { type: 'string',  example: 'DT1105' },
          name:         { type: 'string',  example: 'Ramesh Kumar' },
        },
      },

      // ── User ──────────────────────────────────────────────────────────────
      UserResponse: {
        type: 'object',
        properties: {
          id:             { type: 'integer', example: 1 },
          employee_id:    { type: 'string',  example: 'DT1001' },
          name:           { type: 'string',  example: 'Amit Sharma' },
          email:          { type: 'string',  example: 'amit@dynatech.com' },
          phone:          { type: 'string',  example: '+919876543210' },
          landing_page:   { type: 'string',  example: 'dashboard' },
          is_first_login: { type: 'boolean', example: false },
          is_active:      { type: 'boolean', example: true },
          department_id:  { type: 'integer', example: 1 },
          role_id:        { type: 'integer', example: 1 },
          Department:     { $ref: '#/components/schemas/Department' },
          Role:           { $ref: '#/components/schemas/Role' },
          Sites:          { type: 'array', items: { $ref: '#/components/schemas/SiteShort' } },
          Warehouses:     { type: 'array', items: { $ref: '#/components/schemas/WarehouseShort' } },
          createdAt:      { type: 'string', format: 'date-time', example: '2026-01-15T08:30:00.000Z' },
          updatedAt:      { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' },
        },
      },
      CreateUserRequest: {
        type:     'object',
        required: ['name', 'email', 'role_id', 'department_id'],
        properties: {
          name:          { type: 'string',  example: 'Priya Mehta', minLength: 2, maxLength: 100 },
          email:         { type: 'string',  format: 'email', example: 'priya@dynatech.com' },
          phone:         { type: 'string',  example: '+919876543211' },
          role_id:       { type: 'integer', example: 3 },
          department_id: { type: 'integer', example: 1 },
          site_ids:      { type: 'array',   items: { type: 'integer' }, example: [1, 2] },
          warehouse_ids: { type: 'array',   items: { type: 'integer' }, example: [1] },
          landing_page:  { type: 'string',  example: 'iqc' },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        description: 'All fields optional — send only what needs to change',
        properties: {
          name:          { type: 'string',  example: 'Priya Mehta Updated' },
          email:         { type: 'string',  format: 'email', example: 'priya.new@dynatech.com' },
          phone:         { type: 'string',  example: '+919876543299' },
          role_id:       { type: 'integer', example: 4 },
          department_id: { type: 'integer', example: 1 },
          site_ids:      { type: 'array',   items: { type: 'integer' }, example: [1] },
          warehouse_ids: { type: 'array',   items: { type: 'integer' }, example: [] },
          landing_page:  { type: 'string',  example: 'production' },
        },
      },

      // ── Site ──────────────────────────────────────────────────────────────
      SiteResponse: {
        type: 'object',
        properties: {
          id:         { type: 'integer', example: 1 },
          name:       { type: 'string',  example: 'Main Plant' },
          code:       { type: 'string',  example: 'MP' },
          address:    { type: 'string',  example: 'Plot 12, MIDC, Pune' },
          city:       { type: 'string',  example: 'Pune' },
          state:      { type: 'string',  example: 'Maharashtra' },
          country:    { type: 'string',  example: 'India' },
          is_active:  { type: 'boolean', example: true },
          created_by: { type: 'integer', example: 1 },
          updated_by: { type: 'integer', example: 1 },
          createdAt:  { type: 'string', format: 'date-time', example: '2026-01-15T08:30:00.000Z' },
          updatedAt:  { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' },
        },
      },
      CreateSiteRequest: {
        type:     'object',
        required: ['name', 'code'],
        properties: {
          name:    { type: 'string', example: 'Main Plant',       minLength: 2, maxLength: 100 },
          code:    { type: 'string', example: 'MP',               minLength: 2, maxLength: 20 },
          address: { type: 'string', example: 'Plot 12, MIDC, Pune' },
          city:    { type: 'string', example: 'Pune' },
          state:   { type: 'string', example: 'Maharashtra' },
          country: { type: 'string', example: 'India' },
        },
      },
      UpdateSiteRequest: {
        type: 'object',
        description: 'All fields optional',
        properties: {
          name:    { type: 'string', example: 'Main Plant — Revised' },
          code:    { type: 'string', example: 'MPR' },
          address: { type: 'string', example: 'Plot 15, MIDC, Pune' },
          city:    { type: 'string', example: 'Pune' },
          state:   { type: 'string', example: 'Maharashtra' },
          country: { type: 'string', example: 'India' },
        },
      },

      // ── Shift ─────────────────────────────────────────────────────────────
      ShiftResponse: {
        type: 'object',
        properties: {
          id:                   { type: 'integer', example: 1 },
          name:                 { type: 'string',  example: 'Day Shift' },
          start_time:           { type: 'string',  example: '08:00', description: 'HH:mm format' },
          end_time:             { type: 'string',  example: '17:00', description: 'HH:mm format' },
          lunch_break_duration: { type: 'integer', example: 30,      description: 'Duration in minutes' },
          is_active:            { type: 'boolean', example: true },
          created_by:           { type: 'integer', example: 1 },
          updated_by:           { type: 'integer', example: 1 },
          createdAt:            { type: 'string', format: 'date-time', example: '2026-01-15T08:30:00.000Z' },
          updatedAt:            { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' },
        },
      },
      CreateShiftRequest: {
        type:     'object',
        required: ['name', 'start_time', 'end_time'],
        properties: {
          name:                 { type: 'string',  example: 'Day Shift' },
          start_time:           { type: 'string',  example: '08:00', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          end_time:             { type: 'string',  example: '17:00', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          lunch_break_duration: { type: 'integer', example: 30, minimum: 0, maximum: 480 },
        },
      },
      UpdateShiftRequest: {
        type: 'object',
        description: 'All fields optional',
        properties: {
          name:                 { type: 'string',  example: 'Day Shift Updated' },
          start_time:           { type: 'string',  example: '08:30' },
          end_time:             { type: 'string',  example: '17:30' },
          lunch_break_duration: { type: 'integer', example: 45 },
        },
      },

      // ── Audit ─────────────────────────────────────────────────────────────
      AuditLog: {
        type: 'object',
        properties: {
          id:          { type: 'integer', example: 101 },
          user_id:     { type: 'integer', example: 1, nullable: true },
          employee_id: { type: 'string',  example: 'DT1001' },
          action:      {
            type: 'string',
            enum: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'FAILED_LOGIN', 'ACCOUNT_LOCKED'],
            example: 'LOGIN',
          },
          status:      { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
          ip_address:  { type: 'string', example: '192.168.1.10' },
          user_agent:  { type: 'string', example: 'Mozilla/5.0 (Windows NT 10.0)...' },
          metadata:    { type: 'object', example: { attempts: 3 }, nullable: true },
          createdAt:   { type: 'string', format: 'date-time', example: '2026-03-06T09:00:00.000Z' },
        },
      },
      AuditSummary: {
        type: 'object',
        properties: {
          total_logins:          { type: 'integer', example: 42 },
          total_failed_attempts: { type: 'integer', example: 2 },
          last_login:            { type: 'string',  format: 'date-time', example: '2026-03-06T09:00:00.000Z' },
          password_changes:      { type: 'integer', example: 1 },
        },
      },

      // ── Notification ──────────────────────────────────────────────────────
      Notification: {
        type: 'object',
        properties: {
          id:        { type: 'integer', example: 1 },
          user_id:   { type: 'integer', example: 1 },
          type:      { type: 'string',  example: 'PASSWORD_RESET' },
          title:     { type: 'string',  example: 'Password Reset' },
          message:   { type: 'string',  example: 'Your password was reset by an admin.' },
          is_read:   { type: 'boolean', example: false },
          createdAt: { type: 'string',  format: 'date-time', example: '2026-03-06T09:00:00.000Z' },
          updatedAt: { type: 'string',  format: 'date-time', example: '2026-03-06T09:05:00.000Z' },
        },
      },
      UnreadCountResponse: {
        type: 'object',
        properties: {
          success:      { type: 'boolean', example: true },
          unread_count: { type: 'integer', example: 3 },
        },
      },

      // ── Warehouse ────────────────────────────────────────────────────
      WarehouseResponse: {
        type: 'object',
        properties: {
          id:                        { type: 'integer', example: 1 },
          name:                      { type: 'string',  example: 'Raw Material Store' },
          code:                      { type: 'string',  example: 'RAW-01' },
          site_id:                   { type: 'integer', example: 1, nullable: true },
          linked_partners:           { type: 'string',  example: 'Partner A, Partner B', nullable: true },
          mrn_to_issue:              { type: 'boolean', example: false },
          rack_tracking:             { type: 'boolean', example: false },
          costing_calculation:       { type: 'boolean', example: false },
          bundle_tracking:           { type: 'boolean', example: false },
          generate_grn_sequentially: { type: 'boolean', example: true },
          grn_prefix:                { type: 'string',  example: 'GRN', nullable: true },
          year_basis:                { type: 'string',  example: 'calendar_year', enum: ['calendar_year', 'financial_year'] },
          pre_approval_params:       { type: 'array', items: { type: 'object' }, example: [] },
          item_level_params:         { type: 'object', example: { approved_tags: [], unapproved_tags: [] } },
          is_active:                 { type: 'boolean', example: true },
          created_by:                { type: 'integer', example: 1 },
          updated_by:                { type: 'integer', example: 1 },
          Creator:                   { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          Updater:                   { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          createdAt:                 { type: 'string', format: 'date-time', example: '2026-01-15T08:30:00.000Z' },
          updatedAt:                 { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' },
        },
      },
      CreateWarehouseRequest: {
        type:     'object',
        required: ['name'],
        properties: {
          name:                      { type: 'string',  example: 'Raw Material Store' },
          site_id:                   { type: 'integer', example: 1 },
          linked_partners:           { type: 'string',  example: 'Partner A, Partner B' },
          mrn_to_issue:              { type: 'boolean', example: false },
          rack_tracking:             { type: 'boolean', example: false },
          costing_calculation:       { type: 'boolean', example: false },
          bundle_tracking:           { type: 'boolean', example: false },
          generate_grn_sequentially: { type: 'boolean', example: true },
          grn_prefix:                { type: 'string',  example: 'GRN' },
          year_basis:                { type: 'string',  example: 'calendar_year', enum: ['calendar_year', 'financial_year'] },
          pre_approval_params:       { type: 'array',   items: { type: 'object' }, example: [] },
          item_level_params:         { type: 'object',  example: { approved_tags: [], unapproved_tags: [] } },
        },
      },
      UpdateWarehouseRequest: {
        type: 'object',
        description: 'All fields optional — send only what needs to change',
        properties: {
          name:                      { type: 'string',  example: 'Raw Material Store Updated' },
          site_id:                   { type: 'integer', example: 2 },
          linked_partners:           { type: 'string',  example: 'Partner C' },
          mrn_to_issue:              { type: 'boolean', example: true },
          rack_tracking:             { type: 'boolean', example: true },
          costing_calculation:       { type: 'boolean', example: false },
          bundle_tracking:           { type: 'boolean', example: false },
          generate_grn_sequentially: { type: 'boolean', example: true },
          grn_prefix:                { type: 'string',  example: 'GRN' },
          year_basis:                { type: 'string',  example: 'financial_year' },
          pre_approval_params:       { type: 'array',   items: { type: 'object' } },
          item_level_params:         { type: 'object' },
        },
      },

      // ── Machine ──────────────────────────────────────────────────────
      MachineResponse: {
        type: 'object',
        properties: {
          id:                    { type: 'integer', example: 1 },
          name:                  { type: 'string',  example: 'CNC Lathe' },
          code:                  { type: 'string',  example: 'CNC-01' },
          parent_id:             { type: 'integer', example: null, nullable: true },
          description:           { type: 'string',  example: 'High-precision turning', nullable: true },
          production_against:    { type: 'string',  example: 'none', enum: ['none', 'work_order', 'sales_order'] },
          shift:                 { type: 'string',  example: 'Day Shift', nullable: true },
          setup_time_hrs:        { type: 'number',  example: 1.5, nullable: true },
          queue_time_days:       { type: 'number',  example: 0.5, nullable: true },
          min_batch_quantity:    { type: 'integer', example: 100, nullable: true },
          item_group_tags:       { type: 'array',   items: { type: 'string' }, example: [] },
          machine_group_tags:    { type: 'array',   items: { type: 'string' }, example: [] },
          iot_device_tags:       { type: 'array',   items: { type: 'string' }, example: [] },
          weighted_production:   { type: 'boolean', example: false },
          auto_production:       { type: 'boolean', example: false },
          start_stop_flow:       { type: 'boolean', example: false },
          serialization:         { type: 'boolean', example: false },
          is_active:             { type: 'boolean', example: true },
          created_by:            { type: 'integer', example: 1 },
          updated_by:            { type: 'integer', example: 1 },
          Creator:               { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          Updater:               { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          Parent:                { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, code: { type: 'string' } }, nullable: true },
          Children:              { type: 'array',  items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, code: { type: 'string' } } } },
          Parameters:            { type: 'array',  items: { $ref: '#/components/schemas/ProductionParameterResponse' } },
          createdAt:             { type: 'string', format: 'date-time', example: '2026-01-15T08:30:00.000Z' },
          updatedAt:             { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' },
        },
      },
      CreateMachineRequest: {
        type:     'object',
        required: ['name'],
        properties: {
          name:               { type: 'string',  example: 'CNC Lathe' },
          parent_id:          { type: 'integer', example: null, nullable: true, description: 'Parent machine ID for hierarchy' },
          description:        { type: 'string',  example: 'High-precision turning' },
          production_against: { type: 'string',  example: 'none', enum: ['none', 'work_order', 'sales_order'] },
          parameter_ids:      { type: 'array',   items: { type: 'integer' }, example: [1, 2], description: 'Production parameter IDs to assign' },
        },
      },
      UpdateMachineRequest: {
        type: 'object',
        description: 'All fields optional — send only what needs to change',
        properties: {
          name:               { type: 'string',  example: 'CNC Lathe Updated' },
          parent_id:          { type: 'integer', example: 2, nullable: true },
          description:        { type: 'string',  example: 'Updated description' },
          production_against: { type: 'string',  example: 'work_order', enum: ['none', 'work_order', 'sales_order'] },
          parameter_ids:      { type: 'array',   items: { type: 'integer' }, example: [1, 3], description: 'Replaces all assigned parameters' },
        },
      },
      BulkCreateMachinesRequest: {
        type:     'object',
        required: ['machines'],
        properties: {
          machines: {
            type: 'array',
            description: 'Array of machines with optional children for hierarchy',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name:               { type: 'string',  example: 'CNC Line' },
                parent_id:          { type: 'integer', example: null, nullable: true },
                description:        { type: 'string',  example: 'CNC production line' },
                production_against: { type: 'string',  example: 'none' },
                parameter_ids:      { type: 'array',   items: { type: 'integer' }, example: [1] },
                children: {
                  type: 'array',
                  description: 'Child machines (recursive)',
                  items: {
                    type: 'object',
                    properties: {
                      name:               { type: 'string',  example: 'CNC Lathe #1' },
                      description:        { type: 'string' },
                      production_against: { type: 'string' },
                      parameter_ids:      { type: 'array', items: { type: 'integer' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      UpdateMachineParametersRequest: {
        type:     'object',
        required: ['parameters'],
        properties: {
          parameters: {
            type: 'array',
            items: {
              type: 'object',
              required: ['parameter_id'],
              properties: {
                parameter_id:  { type: 'integer', example: 1 },
                is_production: { type: 'boolean', example: true,  description: 'Track in production recording' },
                is_barcode:    { type: 'boolean', example: false, description: 'Enable barcode scanning' },
              },
            },
          },
        },
      },

      // ── Item ─────────────────────────────────────────────────────────
      ItemResponse: {
        type: 'object',
        properties: {
          id:          { type: 'integer', example: 1 },
          name:        { type: 'string',  example: 'Steel Shaft' },
          code:        { type: 'string',  example: 'STE-01' },
          description: { type: 'string',  example: 'Grade: EN8', nullable: true },
          unit:        { type: 'string',  example: 'Nos', nullable: true },
          hsn_code:    { type: 'string',  example: '7307', nullable: true },
          category:    { type: 'string',  example: 'Raw Material', enum: ['Raw Material', 'Component', 'Finished Good', 'Consumable'], nullable: true },
          is_active:   { type: 'boolean', example: true },
          created_by:  { type: 'integer', example: 1 },
          updated_by:  { type: 'integer', example: 1 },
          Creator:     { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          Updater:     { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          createdAt:   { type: 'string', format: 'date-time', example: '2026-01-15T08:30:00.000Z' },
          updatedAt:   { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' },
        },
      },
      CreateItemRequest: {
        type:     'object',
        required: ['name'],
        properties: {
          name:        { type: 'string', example: 'Steel Shaft' },
          description: { type: 'string', example: 'Grade: EN8' },
          unit:        { type: 'string', example: 'Nos', description: 'Unit of measure (Kg, Nos, Mtr, etc.)' },
          hsn_code:    { type: 'string', example: '7307' },
          category:    { type: 'string', example: 'Raw Material', enum: ['Raw Material', 'Component', 'Finished Good', 'Consumable'] },
        },
      },
      UpdateItemRequest: {
        type: 'object',
        description: 'All fields optional — send only what needs to change',
        properties: {
          name:        { type: 'string', example: 'Steel Shaft Updated' },
          description: { type: 'string', example: 'Grade: EN24' },
          unit:        { type: 'string', example: 'Kg' },
          hsn_code:    { type: 'string', example: '7308' },
          category:    { type: 'string', example: 'Component', enum: ['Raw Material', 'Component', 'Finished Good', 'Consumable'] },
        },
      },

      // ── Production Parameter ─────────────────────────────────────────
      ProductionParameterResponse: {
        type: 'object',
        properties: {
          id:         { type: 'integer', example: 1 },
          name:       { type: 'string',  example: 'Temperature' },
          type:       { type: 'string',  example: 'number', enum: ['text', 'number', 'date', 'datetime', 'derived', 'integrated', 'checkbox'] },
          formula:    { type: 'string',  example: null, nullable: true, description: 'Formula expression (for derived type)' },
          ctq:        { type: 'string',  example: null, nullable: true, description: 'CTQ expression (for derived type)' },
          is_active:  { type: 'boolean', example: true },
          created_by: { type: 'integer', example: 1 },
          updated_by: { type: 'integer', example: 1 },
          Creator:    { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          Updater:    { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, employee_id: { type: 'string' } }, nullable: true },
          createdAt:  { type: 'string', format: 'date-time', example: '2026-01-15T08:30:00.000Z' },
          updatedAt:  { type: 'string', format: 'date-time', example: '2026-03-01T10:00:00.000Z' },
        },
      },
      CreateProductionParameterRequest: {
        type:     'object',
        required: ['name'],
        properties: {
          name:    { type: 'string',  example: 'Temperature' },
          type:    { type: 'string',  example: 'number', enum: ['text', 'number', 'date', 'datetime', 'derived', 'integrated', 'checkbox'] },
          formula: { type: 'string',  example: 'force / area', description: 'Required for derived type' },
          ctq:     { type: 'string',  example: 'stress < 250', description: 'CTQ expression for derived type' },
        },
      },
      BulkCreateProductionParametersRequest: {
        type:     'object',
        required: ['parameters'],
        properties: {
          parameters: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name:    { type: 'string', example: 'Pressure' },
                type:    { type: 'string', example: 'number', enum: ['text', 'number', 'date', 'datetime', 'derived', 'integrated', 'checkbox'] },
                formula: { type: 'string' },
                ctq:     { type: 'string' },
              },
            },
          },
        },
      },
      // ── Work Order ────────────────────────────────────────────────────────
      WorkOrderResponse: {
        type: 'object',
        properties: {
          id:                { type: 'string',  format: 'uuid',      example: 'a1b2c3d4-e5f6-...' },
          wo_no:             { type: 'string',                        example: 'WO-2026-0001' },
          item_id:           { type: 'integer',                       example: 5 },
          qty_planned:       { type: 'number',                        example: 100 },
          qty_produced:      { type: 'number',                        example: 0 },
          machine_id:        { type: 'integer',  nullable: true,      example: 2 },
          shift_id:          { type: 'integer',  nullable: true,      example: 1 },
          customer_order_id: { type: 'string',   nullable: true },
          planned_start:     { type: 'string',   format: 'date',      example: '2026-03-15' },
          planned_end:       { type: 'string',   format: 'date',      example: '2026-03-20', nullable: true },
          actual_start:      { type: 'string',   format: 'date-time', nullable: true },
          actual_end:        { type: 'string',   format: 'date-time', nullable: true },
          status:            { type: 'string',   example: 'draft',    enum: ['draft','open','in_progress','on_hold','completed','cancelled'] },
          notes:             { type: 'string',   nullable: true },
          created_by:        { type: 'integer',  example: 1 },
          Item:              { type: 'object', nullable: true, properties: { id: { type: 'integer' }, name: { type: 'string' }, code: { type: 'string' } } },
          Machine:           { type: 'object', nullable: true, properties: { id: { type: 'integer' }, name: { type: 'string' } } },
          createdAt:         { type: 'string',   format: 'date-time' },
        },
      },
      CreateWorkOrderRequest: {
        type: 'object', required: ['item_id', 'qty_planned', 'planned_start'],
        properties: {
          item_id:           { type: 'integer', example: 5 },
          qty_planned:       { type: 'number',  example: 100 },
          machine_id:        { type: 'integer', nullable: true },
          shift_id:          { type: 'integer', nullable: true },
          customer_order_id: { type: 'string',  format: 'uuid', nullable: true },
          planned_start:     { type: 'string',  format: 'date', example: '2026-03-15' },
          planned_end:       { type: 'string',  format: 'date', example: '2026-03-20', nullable: true },
          notes:             { type: 'string',  nullable: true },
        },
      },
      UpdateWorkOrderStatusRequest: {
        type: 'object', required: ['status'],
        properties: {
          status: { type: 'string', enum: ['open','in_progress','on_hold','completed','cancelled'], example: 'open' },
        },
      },

      // ── Job Card ──────────────────────────────────────────────────────────
      JobCardResponse: {
        type: 'object',
        properties: {
          id:               { type: 'string',  format: 'uuid',      example: 'b2c3d4e5-...' },
          jc_no:            { type: 'string',                        example: 'JC-2026-0001' },
          work_order_id:    { type: 'string',  format: 'uuid' },
          machine_id:       { type: 'integer', nullable: true },
          shift_id:         { type: 'integer', nullable: true },
          operator_id:      { type: 'integer', nullable: true },
          start_time:       { type: 'string',  format: 'date-time', nullable: true },
          end_time:         { type: 'string',  format: 'date-time', nullable: true },
          qty_produced:     { type: 'number',  example: 50 },
          qty_rejected:     { type: 'number',  example: 2 },
          status:           { type: 'string',  enum: ['open','in_progress','completed','rejected'], example: 'open' },
          parameter_values: { type: 'object',  nullable: true, description: 'JSON of production parameter readings' },
          notes:            { type: 'string',  nullable: true },
          createdAt:        { type: 'string',  format: 'date-time' },
        },
      },
      CreateJobCardRequest: {
        type: 'object', required: ['work_order_id'],
        properties: {
          work_order_id:    { type: 'string',  format: 'uuid' },
          machine_id:       { type: 'integer', nullable: true },
          shift_id:         { type: 'integer', nullable: true },
          operator_id:      { type: 'integer', nullable: true },
          qty_produced:     { type: 'number',  example: 50 },
          qty_rejected:     { type: 'number',  example: 2 },
          parameter_values: { type: 'object',  nullable: true },
          notes:            { type: 'string',  nullable: true },
        },
      },

      // ── LQC Inspection ────────────────────────────────────────────────────
      LqcInspectionResponse: {
        type: 'object',
        properties: {
          id:             { type: 'string',  format: 'uuid' },
          reference_type: { type: 'string',  enum: ['job_card','work_order','production_schedule'], example: 'job_card' },
          reference_id:   { type: 'string',  format: 'uuid' },
          parameter_id:   { type: 'integer', example: 3 },
          actual_value:   { type: 'string',  example: '24.5', nullable: true },
          result:         { type: 'string',  enum: ['pass','fail','na'], example: 'pass' },
          remarks:        { type: 'string',  nullable: true },
          inspected_by:   { type: 'integer', example: 5 },
          inspected_at:   { type: 'string',  format: 'date-time' },
          createdAt:      { type: 'string',  format: 'date-time' },
        },
      },
      CreateLqcInspectionRequest: {
        type: 'object', required: ['reference_type', 'reference_id', 'parameter_id'],
        properties: {
          reference_type: { type: 'string', enum: ['job_card','work_order','production_schedule'] },
          reference_id:   { type: 'string', format: 'uuid' },
          parameter_id:   { type: 'integer', example: 3 },
          actual_value:   { type: 'string',  example: '24.5', nullable: true },
          result:         { type: 'string',  enum: ['pass','fail','na'], example: 'pass' },
          remarks:        { type: 'string',  nullable: true },
        },
      },

      // ── Production Schedule ───────────────────────────────────────────────
      ProductionScheduleResponse: {
        type: 'object',
        properties: {
          id:         { type: 'string',  format: 'uuid' },
          sched_no:   { type: 'string',  example: 'PS-2026-0001' },
          title:      { type: 'string',  example: 'Week 12 Schedule' },
          machine_id: { type: 'integer', nullable: true },
          shift_id:   { type: 'integer', nullable: true },
          start_date: { type: 'string',  format: 'date', example: '2026-03-18' },
          end_date:   { type: 'string',  format: 'date', example: '2026-03-22' },
          status:     { type: 'string',  enum: ['draft','published','closed'], example: 'draft' },
          notes:      { type: 'string',  nullable: true },
          created_by: { type: 'integer', example: 1 },
          createdAt:  { type: 'string',  format: 'date-time' },
        },
      },
      CreateProductionScheduleRequest: {
        type: 'object', required: ['title', 'start_date', 'end_date'],
        properties: {
          title:      { type: 'string',  example: 'Week 12 Schedule' },
          machine_id: { type: 'integer', nullable: true },
          shift_id:   { type: 'integer', nullable: true },
          start_date: { type: 'string',  format: 'date', example: '2026-03-18' },
          end_date:   { type: 'string',  format: 'date', example: '2026-03-22' },
          notes:      { type: 'string',  nullable: true },
        },
      },

      // ── Scrap Voucher ─────────────────────────────────────────────────────
      ScrapVoucherResponse: {
        type: 'object',
        properties: {
          id:            { type: 'string',  format: 'uuid' },
          sv_no:         { type: 'string',  example: 'SV-2026-0001' },
          item_id:       { type: 'integer', example: 5 },
          scrap_date:    { type: 'string',  format: 'date', example: '2026-03-10' },
          qty_scrapped:  { type: 'number',  example: 3.5 },
          work_order_id: { type: 'string',  format: 'uuid', nullable: true },
          machine_id:    { type: 'integer', nullable: true },
          reason:        { type: 'string',  nullable: true },
          cost_per_unit: { type: 'number',  example: 250 },
          status:        { type: 'string',  enum: ['pending','approved','rejected'], example: 'pending' },
          notes:         { type: 'string',  nullable: true },
          created_by:    { type: 'integer', example: 1 },
          createdAt:     { type: 'string',  format: 'date-time' },
        },
      },
      CreateScrapVoucherRequest: {
        type: 'object', required: ['item_id', 'scrap_date', 'qty_scrapped'],
        properties: {
          item_id:       { type: 'integer', example: 5 },
          scrap_date:    { type: 'string',  format: 'date', example: '2026-03-10' },
          qty_scrapped:  { type: 'number',  example: 3.5 },
          work_order_id: { type: 'string',  format: 'uuid', nullable: true },
          machine_id:    { type: 'integer', nullable: true },
          reason:        { type: 'string',  nullable: true },
          cost_per_unit: { type: 'number',  example: 250 },
          notes:         { type: 'string',  nullable: true },
        },
      },

      // ── Purchase Order ────────────────────────────────────────────────────
      PurchaseOrderResponse: {
        type: 'object',
        properties: {
          id:            { type: 'string',  format: 'uuid' },
          po_no:         { type: 'string',  example: 'PO-2026-0001' },
          vendor_id:     { type: 'integer', example: 3 },
          order_date:    { type: 'string',  format: 'date', example: '2026-03-10' },
          expected_date: { type: 'string',  format: 'date', nullable: true },
          status:        { type: 'string',  enum: ['draft','submitted','partially_received','received','cancelled'], example: 'draft' },
          notes:         { type: 'string',  nullable: true },
          Vendor:        { type: 'object',  nullable: true, properties: { id: { type: 'integer' }, name: { type: 'string' } } },
          Items:         { type: 'array',   items: { type: 'object', properties: { id: { type: 'string' }, item_id: { type: 'integer' }, qty_ordered: { type: 'number' }, qty_received: { type: 'number' }, unit_price: { type: 'number' }, unit: { type: 'string' } } } },
          created_by:    { type: 'integer', example: 1 },
          createdAt:     { type: 'string',  format: 'date-time' },
        },
      },
      CreatePurchaseOrderRequest: {
        type: 'object', required: ['vendor_id', 'order_date', 'items'],
        properties: {
          vendor_id:     { type: 'integer', example: 3 },
          order_date:    { type: 'string',  format: 'date', example: '2026-03-10' },
          expected_date: { type: 'string',  format: 'date', nullable: true },
          notes:         { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty_ordered'],
              properties: {
                item_id:     { type: 'integer', example: 5 },
                qty_ordered: { type: 'number',  example: 100 },
                unit_price:  { type: 'number',  example: 50.0, nullable: true },
                unit:        { type: 'string',  example: 'pcs' },
                notes:       { type: 'string',  nullable: true },
              },
            },
          },
        },
      },
      ReceivePurchaseOrderRequest: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object', required: ['id', 'qty_received'],
              properties: {
                id:           { type: 'string', format: 'uuid', description: 'PO line item ID' },
                qty_received: { type: 'number', example: 90 },
              },
            },
          },
        },
      },

      // ── Subcontract Challan ───────────────────────────────────────────────
      SubcontractChallanResponse: {
        type: 'object',
        properties: {
          id:            { type: 'string',  format: 'uuid' },
          challan_no:    { type: 'string',  example: 'OC-2026-0001' },
          type:          { type: 'string',  enum: ['outward','inward'], example: 'outward' },
          vendor_id:     { type: 'integer', example: 3 },
          challan_date:  { type: 'string',  format: 'date', example: '2026-03-10' },
          work_order_id: { type: 'string',  format: 'uuid', nullable: true },
          status:        { type: 'string',  enum: ['pending','received','cancelled'], example: 'pending' },
          notes:         { type: 'string',  nullable: true },
          Vendor:        { type: 'object',  nullable: true, properties: { id: { type: 'integer' }, name: { type: 'string' } } },
          Items:         { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, qty: { type: 'number' }, unit: { type: 'string' } } } },
          created_by:    { type: 'integer', example: 1 },
          createdAt:     { type: 'string',  format: 'date-time' },
        },
      },
      CreateSubcontractChallanRequest: {
        type: 'object', required: ['type', 'vendor_id', 'challan_date', 'items'],
        properties: {
          type:          { type: 'string',  enum: ['outward','inward'], example: 'outward' },
          vendor_id:     { type: 'integer', example: 3 },
          challan_date:  { type: 'string',  format: 'date', example: '2026-03-10' },
          work_order_id: { type: 'string',  format: 'uuid', nullable: true },
          notes:         { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty'],
              properties: {
                item_id:    { type: 'integer', example: 5 },
                qty:        { type: 'number',  example: 50 },
                unit:       { type: 'string',  example: 'pcs' },
                notes:      { type: 'string',  nullable: true },
              },
            },
          },
        },
      },

      // ── RFQ ───────────────────────────────────────────────────────────────
      RfqResponse: {
        type: 'object',
        properties: {
          id:            { type: 'string',  format: 'uuid' },
          rfq_no:        { type: 'string',  example: 'RFQ-2026-0001' },
          rfq_date:      { type: 'string',  format: 'date', example: '2026-03-05' },
          expected_date: { type: 'string',  format: 'date', nullable: true },
          status:        { type: 'string',  enum: ['draft','sent','closed'], example: 'draft' },
          notes:         { type: 'string',  nullable: true },
          Vendors:       { type: 'array',   items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } } },
          Items:         { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, qty: { type: 'number' }, unit: { type: 'string' } } } },
          created_by:    { type: 'integer', example: 1 },
          createdAt:     { type: 'string',  format: 'date-time' },
        },
      },
      CreateRfqRequest: {
        type: 'object', required: ['rfq_date', 'items'],
        properties: {
          rfq_date:      { type: 'string',  format: 'date', example: '2026-03-05' },
          expected_date: { type: 'string',  format: 'date', nullable: true },
          vendor_ids:    { type: 'array',   items: { type: 'integer' }, example: [1, 2, 3] },
          notes:         { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty'],
              properties: {
                item_id: { type: 'integer', example: 5 },
                qty:     { type: 'number',  example: 100 },
                unit:    { type: 'string',  example: 'pcs' },
                notes:   { type: 'string',  nullable: true },
              },
            },
          },
        },
      },

      // ── Quotation ─────────────────────────────────────────────────────────
      QuotationResponse: {
        type: 'object',
        properties: {
          id:          { type: 'string',  format: 'uuid' },
          quote_no:    { type: 'string',  example: 'QT-2026-0001' },
          rfq_id:      { type: 'string',  format: 'uuid', nullable: true },
          vendor_id:   { type: 'integer', example: 3 },
          quote_date:  { type: 'string',  format: 'date', example: '2026-03-07' },
          valid_until: { type: 'string',  format: 'date', nullable: true },
          status:      { type: 'string',  enum: ['draft','submitted','accepted','rejected'], example: 'draft' },
          notes:       { type: 'string',  nullable: true },
          Vendor:      { type: 'object',  nullable: true, properties: { id: { type: 'integer' }, name: { type: 'string' } } },
          Items:       { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, qty: { type: 'number' }, unit_price: { type: 'number' }, unit: { type: 'string' } } } },
          created_by:  { type: 'integer', example: 1 },
          createdAt:   { type: 'string',  format: 'date-time' },
        },
      },
      CreateQuotationRequest: {
        type: 'object', required: ['vendor_id', 'quote_date', 'items'],
        properties: {
          rfq_id:      { type: 'string',  format: 'uuid', nullable: true },
          vendor_id:   { type: 'integer', example: 3 },
          quote_date:  { type: 'string',  format: 'date', example: '2026-03-07' },
          valid_until: { type: 'string',  format: 'date', nullable: true },
          notes:       { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty'],
              properties: {
                item_id:    { type: 'integer', example: 5 },
                qty:        { type: 'number',  example: 100 },
                unit_price: { type: 'number',  example: 45.0 },
                unit:       { type: 'string',  example: 'pcs' },
              },
            },
          },
        },
      },

      // ── Customer Order ────────────────────────────────────────────────────
      CustomerOrderResponse: {
        type: 'object',
        properties: {
          id:            { type: 'string',  format: 'uuid' },
          order_no:      { type: 'string',  example: 'CO-2026-0001' },
          customer_name: { type: 'string',  example: 'Tata Motors Ltd' },
          order_no_ext:  { type: 'string',  example: 'TML/PO/2026/0089', nullable: true },
          order_date:    { type: 'string',  format: 'date', example: '2026-03-01' },
          expected_date: { type: 'string',  format: 'date', nullable: true },
          status:        { type: 'string',  enum: ['draft','confirmed','partially_delivered','delivered','cancelled'], example: 'draft' },
          notes:         { type: 'string',  nullable: true },
          Items:         { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, qty_ordered: { type: 'number' }, unit: { type: 'string' } } } },
          created_by:    { type: 'integer', example: 1 },
          createdAt:     { type: 'string',  format: 'date-time' },
        },
      },
      CreateCustomerOrderRequest: {
        type: 'object', required: ['customer_name', 'order_date', 'items'],
        properties: {
          customer_name: { type: 'string', example: 'Tata Motors Ltd' },
          order_no_ext:  { type: 'string', example: 'TML/PO/2026/0089', nullable: true },
          order_date:    { type: 'string', format: 'date', example: '2026-03-01' },
          expected_date: { type: 'string', format: 'date', nullable: true },
          notes:         { type: 'string', nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty_ordered'],
              properties: {
                item_id:     { type: 'integer', example: 5 },
                qty_ordered: { type: 'number',  example: 500 },
                unit:        { type: 'string',  example: 'Nos' },
              },
            },
          },
        },
      },

      // ── GRN ───────────────────────────────────────────────────────────────
      GrnResponse: {
        type: 'object',
        properties: {
          id:         { type: 'string',  format: 'uuid' },
          grn_no:     { type: 'string',  example: 'GRN-2026-0001' },
          vendor_id:  { type: 'integer', example: 3 },
          po_id:      { type: 'string',  format: 'uuid', nullable: true },
          grn_date:   { type: 'string',  format: 'date', example: '2026-03-12' },
          vehicle_no: { type: 'string',  example: 'MH12AB1234', nullable: true },
          status:     { type: 'string',  enum: ['draft','verified','rejected'], example: 'draft' },
          notes:      { type: 'string',  nullable: true },
          Vendor:     { type: 'object',  nullable: true, properties: { id: { type: 'integer' }, name: { type: 'string' } } },
          Items:      { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, qty_received: { type: 'number' }, unit: { type: 'string' } } } },
          created_by: { type: 'integer', example: 1 },
          createdAt:  { type: 'string',  format: 'date-time' },
        },
      },
      CreateGrnRequest: {
        type: 'object', required: ['vendor_id', 'grn_date', 'items'],
        properties: {
          vendor_id:  { type: 'integer', example: 3 },
          po_id:      { type: 'string',  format: 'uuid', nullable: true },
          grn_date:   { type: 'string',  format: 'date', example: '2026-03-12' },
          vehicle_no: { type: 'string',  example: 'MH12AB1234', nullable: true },
          notes:      { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty_received'],
              properties: {
                item_id:      { type: 'integer', example: 5 },
                qty_received: { type: 'number',  example: 90 },
                unit:         { type: 'string',  example: 'pcs' },
                notes:        { type: 'string',  nullable: true },
              },
            },
          },
        },
      },

      // ── Material Request ──────────────────────────────────────────────────
      MaterialRequestResponse: {
        type: 'object',
        properties: {
          id:           { type: 'string',  format: 'uuid' },
          mr_no:        { type: 'string',  example: 'MR-2026-0001' },
          warehouse_id: { type: 'integer', example: 1 },
          purpose:      { type: 'string',  example: 'Production', nullable: true },
          needed_by:    { type: 'string',  format: 'date', nullable: true },
          status:       { type: 'string',  enum: ['draft','pending','approved','rejected','partially_issued','issued'], example: 'draft' },
          notes:        { type: 'string',  nullable: true },
          Items:        { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, qty_requested: { type: 'number' }, qty_issued: { type: 'number' } } } },
          created_by:   { type: 'integer', example: 1 },
          createdAt:    { type: 'string',  format: 'date-time' },
        },
      },
      CreateMaterialRequestRequest: {
        type: 'object', required: ['items'],
        properties: {
          warehouse_id: { type: 'integer', example: 1 },
          purpose:      { type: 'string',  example: 'Production', nullable: true },
          needed_by:    { type: 'string',  format: 'date', nullable: true },
          notes:        { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty_requested'],
              properties: {
                item_id:       { type: 'integer', example: 5 },
                qty_requested: { type: 'number',  example: 20 },
                notes:         { type: 'string',  nullable: true },
              },
            },
          },
        },
      },

      // ── Issue Slip ────────────────────────────────────────────────────────
      IssueSlipResponse: {
        type: 'object',
        properties: {
          id:           { type: 'string',  format: 'uuid' },
          issue_no:     { type: 'string',  example: 'IS-2026-0001' },
          mr_id:        { type: 'string',  format: 'uuid', nullable: true },
          warehouse_id: { type: 'integer', example: 1 },
          issued_date:  { type: 'string',  format: 'date', example: '2026-03-12' },
          notes:        { type: 'string',  nullable: true },
          Items:        { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, qty_issued: { type: 'number' }, unit: { type: 'string' } } } },
          created_by:   { type: 'integer', example: 1 },
          createdAt:    { type: 'string',  format: 'date-time' },
        },
      },
      CreateIssueSlipRequest: {
        type: 'object', required: ['issued_date', 'items'],
        properties: {
          mr_id:        { type: 'string',  format: 'uuid', nullable: true },
          warehouse_id: { type: 'integer', example: 1 },
          issued_date:  { type: 'string',  format: 'date', example: '2026-03-12' },
          notes:        { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'qty_issued'],
              properties: {
                item_id:    { type: 'integer', example: 5 },
                qty_issued: { type: 'number',  example: 20 },
                unit:       { type: 'string',  example: 'pcs' },
              },
            },
          },
        },
      },

      // ── Stock Adjustment ──────────────────────────────────────────────────
      StockAdjustmentResponse: {
        type: 'object',
        properties: {
          id:           { type: 'string',  format: 'uuid' },
          adj_no:       { type: 'string',  example: 'SA-2026-0001' },
          warehouse_id: { type: 'integer', example: 1 },
          adj_date:     { type: 'string',  format: 'date', example: '2026-03-10' },
          reason:       { type: 'string',  example: 'Physical stock count', nullable: true },
          status:       { type: 'string',  enum: ['draft','approved','rejected'], example: 'draft' },
          notes:        { type: 'string',  nullable: true },
          Items:        { type: 'array',   items: { type: 'object', properties: { item_id: { type: 'integer' }, adj_type: { type: 'string', enum: ['increase','decrease','damage'] }, qty: { type: 'number' } } } },
          created_by:   { type: 'integer', example: 1 },
          createdAt:    { type: 'string',  format: 'date-time' },
        },
      },
      CreateStockAdjustmentRequest: {
        type: 'object', required: ['adj_date', 'items'],
        properties: {
          warehouse_id: { type: 'integer', example: 1 },
          adj_date:     { type: 'string',  format: 'date', example: '2026-03-10' },
          reason:       { type: 'string',  nullable: true },
          notes:        { type: 'string',  nullable: true },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['item_id', 'adj_type', 'qty'],
              properties: {
                item_id:  { type: 'integer', example: 5 },
                adj_type: { type: 'string',  enum: ['increase','decrease','damage'], example: 'increase' },
                qty:      { type: 'number',  example: 10 },
                notes:    { type: 'string',  nullable: true },
              },
            },
          },
        },
      },

    // ── Sprint 4: Quality schemas ─────────────────────────────────────────────

    Capa: {
      type: 'object',
      properties: {
        id:                 { type: 'string', format: 'uuid' },
        capa_no:            { type: 'string', example: 'CAPA-2026-0001' },
        source_type:        { type: 'string', enum: ['complaint','ncr','audit','iqc','lqc','oqc','manual'] },
        source_id:          { type: 'string', format: 'uuid', nullable: true },
        problem_title:      { type: 'string' },
        problem_desc:       { type: 'string', nullable: true },
        champion_id:        { type: 'integer', nullable: true },
        target_date:        { type: 'string', format: 'date', nullable: true },
        containment_action: { type: 'string', nullable: true },
        containment_date:   { type: 'string', format: 'date', nullable: true },
        prevention_action:  { type: 'string', nullable: true },
        closure_notes:      { type: 'string', nullable: true },
        status:             { type: 'string', enum: ['draft','d4_in_progress','d5d6_in_progress','effectiveness','closed'] },
        closed_at:          { type: 'string', format: 'date-time', nullable: true },
        created_at:         { type: 'string', format: 'date-time' },
      },
    },

    CapaTeamMember: {
      type: 'object',
      required: ['user_id'],
      properties: {
        user_id: { type: 'integer' },
        role:    { type: 'string', nullable: true },
      },
    },

    CapaRootCause: {
      type: 'object',
      properties: {
        id:           { type: 'string', format: 'uuid' },
        capa_id:      { type: 'string', format: 'uuid' },
        why_level:    { type: 'integer', minimum: 1, maximum: 5 },
        why_question: { type: 'string', nullable: true },
        why_answer:   { type: 'string', nullable: true },
        is_root:      { type: 'boolean' },
        evidence:     { type: 'string', nullable: true },
      },
    },

    CapaFishbone: {
      type: 'object',
      properties: {
        id:           { type: 'string', format: 'uuid' },
        capa_id:      { type: 'string', format: 'uuid' },
        category:     { type: 'string', enum: ['Man','Machine','Material','Method','Measurement','Mother_Nature'] },
        cause_detail: { type: 'string' },
        is_root:      { type: 'boolean' },
      },
    },

    CapaAction: {
      type: 'object',
      properties: {
        id:                  { type: 'string', format: 'uuid' },
        capa_id:             { type: 'string', format: 'uuid' },
        action_type:         { type: 'string', enum: ['corrective','preventive'] },
        action_desc:         { type: 'string' },
        responsible_id:      { type: 'integer', nullable: true },
        target_date:         { type: 'string', format: 'date', nullable: true },
        completed_date:      { type: 'string', format: 'date', nullable: true },
        verification_method: { type: 'string', nullable: true },
        status:              { type: 'string', enum: ['open','in_progress','completed','verified'] },
      },
    },

    CapaEffectiveness: {
      type: 'object',
      properties: {
        id:               { type: 'string', format: 'uuid' },
        capa_id:          { type: 'string', format: 'uuid' },
        check_period:     { type: 'integer', enum: [30, 60, 90] },
        check_date:       { type: 'string', format: 'date' },
        is_effective:     { type: 'boolean', nullable: true },
        recurrence_found: { type: 'boolean' },
        evidence:         { type: 'string', nullable: true },
        notes:            { type: 'string', nullable: true },
      },
    },

    Ncr: {
      type: 'object',
      properties: {
        id:             { type: 'string', format: 'uuid' },
        ncr_no:         { type: 'string', example: 'NCR-2026-0001' },
        ncr_type:       { type: 'string', enum: ['dimensional','visual','material','process','documentation'] },
        item_id:        { type: 'integer' },
        lot_no:         { type: 'string', nullable: true },
        work_order_id:  { type: 'string', format: 'uuid', nullable: true },
        qty_affected:   { type: 'number', nullable: true },
        defect_desc:    { type: 'string' },
        location_found: { type: 'string', enum: ['iqc','lqc','pqc','oqc','production','store'] },
        photos:         { type: 'array', items: { type: 'string' } },
        cost_per_unit:  { type: 'number', nullable: true },
        total_cost:     { type: 'number', nullable: true },
        status:         { type: 'string', enum: ['raised','under_review','dispositioned','closed'] },
        created_at:     { type: 'string', format: 'date-time' },
      },
    },

    NcrDisposition: {
      type: 'object',
      properties: {
        id:                  { type: 'string', format: 'uuid' },
        ncr_id:              { type: 'string', format: 'uuid' },
        decision:            { type: 'string', enum: ['use_as_is','rework','scrap','return_to_supplier','sort_and_use'] },
        reason:              { type: 'string', nullable: true },
        material_hold_notes: { type: 'string', nullable: true },
        rework_notes:        { type: 'string', nullable: true },
        decision_date:       { type: 'string', format: 'date-time' },
      },
    },

    Complaint: {
      type: 'object',
      properties: {
        id:              { type: 'string', format: 'uuid' },
        complaint_no:    { type: 'string', example: 'COMP-2026-0001' },
        customer_name:   { type: 'string' },
        customer_ref:    { type: 'string', nullable: true },
        item_id:         { type: 'integer' },
        part_no_ext:     { type: 'string', nullable: true },
        qty_affected:    { type: 'number', nullable: true },
        defect_desc:     { type: 'string' },
        delivery_date:   { type: 'string', format: 'date', nullable: true },
        photos:          { type: 'array', items: { type: 'string' } },
        capa_id:         { type: 'string', format: 'uuid', nullable: true },
        status:          { type: 'string', enum: ['received','acknowledged','8d_initiated','closed'] },
        acknowledged_at: { type: 'string', format: 'date-time', nullable: true },
        response_due:    { type: 'string', format: 'date', nullable: true },
        created_at:      { type: 'string', format: 'date-time' },
      },
    },

    // ── Sprint 4: NPD schemas ─────────────────────────────────────────────────

    Drawing: {
      type: 'object',
      properties: {
        id:               { type: 'string', format: 'uuid' },
        drawing_no:       { type: 'string' },
        title:            { type: 'string' },
        item_id:          { type: 'integer', nullable: true },
        customer:         { type: 'string', nullable: true },
        material:         { type: 'string', nullable: true },
        current_revision: { type: 'string' },
        status:           { type: 'string', enum: ['uploaded','pending_approval','released','obsolete'] },
        approved_by:      { type: 'integer', nullable: true },
        approved_at:      { type: 'string', format: 'date-time', nullable: true },
        created_at:       { type: 'string', format: 'date-time' },
      },
    },

    DrawingVersion: {
      type: 'object',
      properties: {
        id:             { type: 'string', format: 'uuid' },
        drawing_id:     { type: 'string', format: 'uuid' },
        revision:       { type: 'string' },
        file_path:      { type: 'string' },
        file_name:      { type: 'string' },
        file_size:      { type: 'integer', nullable: true },
        extracted_data: { type: 'object', nullable: true },
        drawn_by:       { type: 'string', nullable: true },
        drawing_date:   { type: 'string', format: 'date', nullable: true },
        scale:          { type: 'string', nullable: true },
        tolerances:     { type: 'string', nullable: true },
        change_desc:    { type: 'string', nullable: true },
        is_current:     { type: 'boolean' },
        created_at:     { type: 'string', format: 'date-time' },
      },
    },

    CheckSheetTemplate: {
      type: 'object',
      properties: {
        id:               { type: 'string', format: 'uuid' },
        drawing_id:       { type: 'string', format: 'uuid' },
        item_id:          { type: 'integer' },
        name:             { type: 'string' },
        revision:         { type: 'string' },
        applicable_gates: { type: 'array', items: { type: 'string', enum: ['iqc','lqc','pqc','oqc'] } },
        is_active:        { type: 'boolean' },
        created_at:       { type: 'string', format: 'date-time' },
      },
    },

    CheckSheetDimension: {
      type: 'object',
      properties: {
        id:             { type: 'string', format: 'uuid' },
        template_id:    { type: 'string', format: 'uuid' },
        balloon_no:     { type: 'string', nullable: true },
        dimension_desc: { type: 'string' },
        nominal:        { type: 'number' },
        usl:            { type: 'number', nullable: true },
        lsl:            { type: 'number', nullable: true },
        unit:           { type: 'string', nullable: true },
        instrument:     { type: 'string', nullable: true },
        classification: { type: 'string', enum: ['critical','major','minor'] },
        sample_size:    { type: 'integer' },
        sort_order:     { type: 'integer' },
      },
    },

    Pfmea: {
      type: 'object',
      properties: {
        id:            { type: 'string', format: 'uuid' },
        pfmea_no:      { type: 'string', example: 'PFMEA-2026-0001' },
        item_id:       { type: 'integer' },
        drawing_id:    { type: 'string', format: 'uuid', nullable: true },
        title:         { type: 'string' },
        revision:      { type: 'string', nullable: true },
        document_date: { type: 'string', format: 'date', nullable: true },
        review_date:   { type: 'string', format: 'date', nullable: true },
        status:        { type: 'string', enum: ['draft','active','obsolete'] },
        created_at:    { type: 'string', format: 'date-time' },
      },
    },

    PfmeaItem: {
      type: 'object',
      properties: {
        id:               { type: 'string', format: 'uuid' },
        pfmea_id:         { type: 'string', format: 'uuid' },
        process_step:     { type: 'string' },
        process_function: { type: 'string', nullable: true },
        failure_mode:     { type: 'string' },
        failure_effect:   { type: 'string' },
        failure_cause:    { type: 'string' },
        severity:         { type: 'integer', minimum: 1, maximum: 10 },
        occurrence:       { type: 'integer', minimum: 1, maximum: 10 },
        detection:        { type: 'integer', minimum: 1, maximum: 10 },
        action_priority:  { type: 'integer', description: 'S × O × D' },
        current_controls: { type: 'string', nullable: true },
        sort_order:       { type: 'integer' },
      },
    },

    PfmeaAction: {
      type: 'object',
      properties: {
        id:               { type: 'string', format: 'uuid' },
        pfmea_item_id:    { type: 'string', format: 'uuid' },
        action_desc:      { type: 'string' },
        responsible_id:   { type: 'integer', nullable: true },
        target_date:      { type: 'string', format: 'date', nullable: true },
        completed_date:   { type: 'string', format: 'date', nullable: true },
        severity_after:   { type: 'integer', nullable: true },
        occurrence_after: { type: 'integer', nullable: true },
        detection_after:  { type: 'integer', nullable: true },
        ap_after:         { type: 'integer', nullable: true },
        status:           { type: 'string', enum: ['open','in_progress','completed'] },
        evidence:         { type: 'string', nullable: true },
      },
    },
    },
  },

  // ── Paths ─────────────────────────────────────────────────────────────────
  paths: {

    // ── Health ──────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags:        ['Health'],
        summary:     'Server health check',
        description: 'Returns server status. No authentication required.',
        operationId: 'healthCheck',
        responses: {
          200: {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status:  { type: 'string', example: 'ok' },
                    app:     { type: 'string', example: 'Dynatech ONE' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    '/api/auth/login': {
      post: {
        tags:        ['Auth'],
        summary:     'Login (SYS-001)',
        description: [
          'Authenticates an employee using `employee_id` and `password`.',
          '',
          '- Locks account after **5 failed attempts** (15-minute lockout)',
          '- Returns a short-lived **JWT access token** (8 h) and a **refresh token**',
          '- Sets `is_first_login = true` flag on first login — frontend should redirect to change-password screen',
        ].join('\n'),
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          400: { description: 'Validation error',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Invalid credentials',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Account locked',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error',   content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/auth/refresh': {
      post: {
        tags:        ['Auth'],
        summary:     'Refresh access token (SYS-004)',
        description: 'Exchanges a valid refresh token for a new access token + refresh token pair (token rotation). The old refresh token is revoked immediately.',
        operationId: 'refreshToken',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Token refreshed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RefreshResponse' } },
            },
          },
          401: { description: 'Invalid or expired refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error',            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags:        ['Auth'],
        summary:     'Get current user profile',
        description: 'Returns the full profile of the currently authenticated user including Role, Department, Sites, and Warehouses.',
        operationId: 'getMe',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/UserResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
        },
      },
    },

    '/api/auth/change-password': {
      post: {
        tags:        ['Auth'],
        summary:     'Change own password (SYS-002)',
        description: [
          'Allows the authenticated user to change their own password.',
          '',
          '**Rules:**',
          '- `new_password` must be ≥ 8 characters, contain at least 1 uppercase letter and 1 number',
          '- Cannot reuse the current password',
          '- Clears the `is_first_login` flag after first change',
        ].join('\n'),
        operationId: 'changePassword',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } },
          },
        },
        responses: {
          200: { description: 'Password changed',        content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          400: { description: 'Validation / policy error',content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error',   content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/auth/reset-password': {
      post: {
        tags:        ['Auth'],
        summary:     'Admin reset password (SYS-003)',
        description: [
          'Generates a temporary password for an employee.',
          '',
          '**Roles allowed:** `plant_head`, `it_admin`',
          '',
          '- All existing sessions of the target user are revoked',
          '- User receives an in-app notification',
          '- Response includes the generated `temp_password` to be shared with the employee',
        ].join('\n'),
        operationId: 'adminResetPassword',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AdminResetPasswordRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Password reset — temp password returned',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AdminResetPasswordResponse' } },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'User not found',   content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags:        ['Auth'],
        summary:     'Logout',
        description: 'Revokes the current refresh token and ends the session.',
        operationId: 'logout',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Logged out',    content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Users — Lookups ─────────────────────────────────────────────────────
    '/api/users/departments': {
      get: {
        tags:        ['Users'],
        summary:     'List all departments',
        description: 'Returns all 8 departments. Used to populate role/department dropdowns in forms. Any authenticated user can call this.',
        operationId: 'getDepartments',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Department list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/Department' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
        },
      },
    },

    '/api/users/roles': {
      get: {
        tags:        ['Users'],
        summary:     'List all roles',
        description: 'Returns all 16 roles across 8 departments. Any authenticated user can call this.',
        operationId: 'getRoles',
        security:    [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'department_id', in: 'query', required: false,
            schema: { type: 'integer', example: 11 },
            description: 'Filter roles by department',
          },
        ],
        responses: {
          200: {
            description: 'Role list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/Role' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
        },
      },
    },

    '/api/users/sites': {
      get: {
        tags:        ['Users'],
        summary:     'List all sites (lookup)',
        description: 'Returns id + name for all active sites. Used by employee create/edit forms.',
        operationId: 'getSitesLookup',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Site list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/SiteShort' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
        },
      },
    },

    '/api/users/warehouses': {
      get: {
        tags:        ['Users'],
        summary:     'List all warehouses (lookup)',
        description: 'Returns id + name for all warehouses. Used by employee create/edit forms.',
        operationId: 'getWarehousesLookup',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Warehouse list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/WarehouseShort' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
        },
      },
    },

    // ── Users — CRUD ────────────────────────────────────────────────────────
    '/api/users': {
      get: {
        tags:        ['Users'],
        summary:     'List all employees',
        description: 'Returns paginated employee list with Role, Department, Sites, and Warehouses. **Roles:** `plant_head`, `it_admin`',
        operationId: 'getAllUsers',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'department_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by department' },
          { name: 'is_active',     in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
          { name: 'search',        in: 'query', schema: { type: 'string' },  description: 'Search by name, employee_id, or email' },
        ],
        responses: {
          200: {
            description: 'Employee list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/UserResponse' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      post: {
        tags:        ['Users'],
        summary:     'Create employee',
        description: 'Creates a new employee. Auto-generates `employee_id` in format `DT{dept_code}{seq}`. Sets `is_first_login = true`. **Roles:** `plant_head`, `it_admin`',
        operationId: 'createUser',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Employee created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Employee created successfully' },
                    data:    { $ref: '#/components/schemas/UserResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error / duplicate email', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/users/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Employee ID' },
      ],

      get: {
        tags:        ['Users'],
        summary:     'Get employee by ID',
        operationId: 'getUserById',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Employee details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/UserResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      patch: {
        tags:        ['Users'],
        summary:     'Update employee',
        description: 'Partial update. Send only the fields that need changing. Updating `site_ids` or `warehouse_ids` replaces the full M2M list. **Roles:** `plant_head`, `it_admin`',
        operationId: 'updateUser',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Employee updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Employee updated successfully' },
                    data:    { $ref: '#/components/schemas/UserResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/users/{id}/toggle': {
      patch: {
        tags:        ['Users'],
        summary:     'Toggle employee active / inactive',
        description: 'Flips `is_active` status of the employee. **Roles:** `plant_head`, `it_admin`',
        operationId: 'toggleUserStatus',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Employee ID' },
        ],
        responses: {
          200: {
            description: 'Status toggled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success:   { type: 'boolean', example: true },
                    message:   { type: 'string',  example: 'Employee deactivated' },
                    is_active: { type: 'boolean', example: false },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/users/reset-password': {
      post: {
        tags:        ['Users'],
        summary:     'Admin reset employee password',
        description: 'Same as `POST /api/auth/reset-password` — generates a temp password for an employee. **Roles:** `plant_head`, `it_admin`',
        operationId: 'adminResetPasswordAlt',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/AdminResetPasswordRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Password reset',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminResetPasswordResponse' } } },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Sites ───────────────────────────────────────────────────────────────
    '/api/sites': {
      get: {
        tags:        ['Sites'],
        summary:     'List all sites',
        description: 'Returns all sites. Any authenticated user can call this.',
        operationId: 'getAllSites',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'is_active', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
        ],
        responses: {
          200: {
            description: 'Site list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/SiteResponse' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      post: {
        tags:        ['Sites'],
        summary:     'Create site',
        description: '**Roles:** `plant_head`, `it_admin`',
        operationId: 'createSite',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateSiteRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Site created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Site created successfully' },
                    data:    { $ref: '#/components/schemas/SiteResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error / duplicate code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/sites/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Site ID' },
      ],

      get: {
        tags:        ['Sites'],
        summary:     'Get site by ID',
        operationId: 'getSiteById',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Site details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/SiteResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          404: { description: 'Not found',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      patch: {
        tags:        ['Sites'],
        summary:     'Update site',
        description: 'Partial update. **Roles:** `plant_head`, `it_admin`',
        operationId: 'updateSite',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateSiteRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Site updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Site updated successfully' },
                    data:    { $ref: '#/components/schemas/SiteResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/sites/{id}/toggle': {
      patch: {
        tags:        ['Sites'],
        summary:     'Toggle site active / inactive',
        description: '**Roles:** `plant_head`, `it_admin`',
        operationId: 'toggleSiteStatus',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Site ID' },
        ],
        responses: {
          200: {
            description: 'Status toggled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success:   { type: 'boolean', example: true },
                    message:   { type: 'string',  example: 'Site deactivated' },
                    is_active: { type: 'boolean', example: false },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Shifts ──────────────────────────────────────────────────────────────
    '/api/shifts': {
      get: {
        tags:        ['Shifts'],
        summary:     'List all shifts',
        description: '**Roles:** `plant_head`, `it_admin`',
        operationId: 'getAllShifts',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Shift list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/ShiftResponse' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      post: {
        tags:        ['Shifts'],
        summary:     'Create shift',
        description: '**Roles:** `plant_head`, `it_admin`',
        operationId: 'createShift',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateShiftRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Shift created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Shift created successfully' },
                    data:    { $ref: '#/components/schemas/ShiftResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error / duplicate name', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/shifts/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Shift ID' },
      ],

      get: {
        tags:        ['Shifts'],
        summary:     'Get shift by ID',
        operationId: 'getShiftById',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Shift details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/ShiftResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      patch: {
        tags:        ['Shifts'],
        summary:     'Update shift',
        description: 'Partial update. **Roles:** `plant_head`, `it_admin`',
        operationId: 'updateShift',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateShiftRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Shift updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Shift updated successfully' },
                    data:    { $ref: '#/components/schemas/ShiftResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      delete: {
        tags:        ['Shifts'],
        summary:     'Delete shift',
        description: 'Permanently deletes the shift. **Roles:** `plant_head`, `it_admin`',
        operationId: 'deleteShift',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Shift deleted',     content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',         content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',         content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Audit ───────────────────────────────────────────────────────────────
    '/api/audit/summary': {
      get: {
        tags:        ['Audit'],
        summary:     'My audit summary',
        description: 'Returns quick stats for the current user: total logins, failed attempts, last login, password changes.',
        operationId: 'getMyAuditSummary',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Audit summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/AuditSummary' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/audit/my': {
      get: {
        tags:        ['Audit'],
        summary:     'My full audit trail',
        description: 'Returns the current user\'s full audit log, paginated.',
        operationId: 'getMyAuditLog',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'page',     in: 'query', schema: { type: 'integer', default: 1 },   description: 'Page number' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 },  description: 'Records per page' },
          { name: 'action',   in: 'query', schema: { type: 'string'  },               description: 'Filter by action type (LOGIN, LOGOUT, etc.)' },
        ],
        responses: {
          200: {
            description: 'Paginated audit logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
                    total:   { type: 'integer', example: 84 },
                    page:    { type: 'integer', example: 1 },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/audit/all': {
      get: {
        tags:        ['Audit'],
        summary:     'All users\' audit logs',
        description: 'Returns all users\' audit events, paginated. **Roles:** `it_admin`, `plant_head`',
        operationId: 'getAllAuditLogs',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'page',        in: 'query', schema: { type: 'integer', default: 1 },  description: 'Page number' },
          { name: 'pageSize',    in: 'query', schema: { type: 'integer', default: 20 }, description: 'Records per page' },
          { name: 'user_id',     in: 'query', schema: { type: 'integer' },              description: 'Filter by user' },
          { name: 'action',      in: 'query', schema: { type: 'string'  },              description: 'Filter by action type' },
          { name: 'status',      in: 'query', schema: { type: 'string'  },              description: 'SUCCESS or FAILED' },
          { name: 'date_from',   in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date (YYYY-MM-DD)' },
          { name: 'date_to',     in: 'query', schema: { type: 'string', format: 'date' }, description: 'End date (YYYY-MM-DD)' },
        ],
        responses: {
          200: {
            description: 'Paginated audit logs (all users)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
                    total:   { type: 'integer', example: 510 },
                    page:    { type: 'integer', example: 1 },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Notifications ───────────────────────────────────────────────────────
    '/api/notifications': {
      get: {
        tags:        ['Notifications'],
        summary:     'Get my notifications',
        description: 'Returns all in-app notifications for the current user, newest first.',
        operationId: 'getMyNotifications',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'is_read', in: 'query', schema: { type: 'boolean' }, description: 'Filter by read status' },
        ],
        responses: {
          200: {
            description: 'Notification list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/notifications/unread-count': {
      get: {
        tags:        ['Notifications'],
        summary:     'Get unread notification count',
        description: 'Returns the number of unread notifications. Used to drive the notification bell badge.',
        operationId: 'getUnreadCount',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Unread count',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UnreadCountResponse' } },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/notifications/read-all': {
      patch: {
        tags:        ['Notifications'],
        summary:     'Mark all notifications as read',
        operationId: 'markAllAsRead',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: { description: 'All marked read', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/notifications/{id}/read': {
      patch: {
        tags:        ['Notifications'],
        summary:     'Mark a notification as read',
        operationId: 'markAsRead',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Notification ID' },
        ],
        responses: {
          200: { description: 'Marked as read', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',   content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          404: { description: 'Not found',      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Warehouses ─────────────────────────────────────────────────────
    '/api/warehouses': {
      get: {
        tags:        ['Warehouses'],
        summary:     'List all warehouses',
        description: 'Returns all warehouses with Creator/Updater audit info. Any authenticated user can call this.',
        operationId: 'getAllWarehouses',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'is_active', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
          { name: 'search',    in: 'query', schema: { type: 'string' },  description: 'Search by name or code' },
        ],
        responses: {
          200: {
            description: 'Warehouse list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/WarehouseResponse' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      post: {
        tags:        ['Warehouses'],
        summary:     'Create warehouse',
        description: 'Auto-generates `code` from name (first 3 letters + sequence). **Roles:** `plant_head`, `it_admin`',
        operationId: 'createWarehouse',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateWarehouseRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Warehouse created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Warehouse "Raw Material Store" created successfully' },
                    data:    { $ref: '#/components/schemas/WarehouseResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',               content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',                  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          409: { description: 'Duplicate code',             content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          500: { description: 'Internal server error',      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/warehouses/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Warehouse ID' },
      ],

      get: {
        tags:        ['Warehouses'],
        summary:     'Get warehouse by ID',
        operationId: 'getWarehouseById',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Warehouse details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/WarehouseResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          404: { description: 'Not found',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      patch: {
        tags:        ['Warehouses'],
        summary:     'Update warehouse',
        description: 'Partial update. `code` and audit fields are read-only. **Roles:** `plant_head`, `it_admin`',
        operationId: 'updateWarehouse',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateWarehouseRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Warehouse updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Warehouse updated successfully' },
                    data:    { $ref: '#/components/schemas/WarehouseResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      delete: {
        tags:        ['Warehouses'],
        summary:     'Delete warehouse',
        description: 'Permanently deletes the warehouse. **Roles:** `plant_head`, `it_admin`',
        operationId: 'deleteWarehouse',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Warehouse deleted',  content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Machines ───────────────────────────────────────────────────────
    '/api/machines': {
      get: {
        tags:        ['Machines'],
        summary:     'List all machines',
        description: 'Returns all machines with Parent, Children, Parameters, and Creator/Updater. Any authenticated user can call this.',
        operationId: 'getAllMachines',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'is_active', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
          { name: 'search',    in: 'query', schema: { type: 'string' },  description: 'Search by name or code' },
        ],
        responses: {
          200: {
            description: 'Machine list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/MachineResponse' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      post: {
        tags:        ['Machines'],
        summary:     'Create machine',
        description: 'Auto-generates `code` from name. Optionally assigns production parameters. **Roles:** `plant_head`, `it_admin`',
        operationId: 'createMachine',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateMachineRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Machine created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Machine "CNC Lathe" created successfully' },
                    data:    { $ref: '#/components/schemas/MachineResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',             content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          409: { description: 'Duplicate code',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/machines/bulk': {
      post: {
        tags:        ['Machines'],
        summary:     'Bulk create machines with hierarchy',
        description: [
          'Creates multiple machines at once with parent-child hierarchy support.',
          '',
          'Each machine can have nested `children` array for recursive creation.',
          '**Roles:** `plant_head`, `it_admin`',
        ].join('\n'),
        operationId: 'bulkCreateMachines',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BulkCreateMachinesRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Machines created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: '3 machine(s) created successfully' },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/MachineResponse' } },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',             content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/machines/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Machine ID' },
      ],

      get: {
        tags:        ['Machines'],
        summary:     'Get machine by ID',
        operationId: 'getMachineById',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Machine details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/MachineResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          404: { description: 'Not found',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      patch: {
        tags:        ['Machines'],
        summary:     'Update machine',
        description: 'Partial update. If `parameter_ids` is sent, it replaces all assigned parameters. **Roles:** `plant_head`, `it_admin`',
        operationId: 'updateMachine',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateMachineRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Machine updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Machine updated successfully' },
                    data:    { $ref: '#/components/schemas/MachineResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      delete: {
        tags:        ['Machines'],
        summary:     'Delete machine',
        description: 'Permanently deletes the machine. **Roles:** `plant_head`, `it_admin`',
        operationId: 'deleteMachine',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Machine deleted',    content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/machines/{id}/parameters': {
      patch: {
        tags:        ['Machines'],
        summary:     'Update machine parameter assignments',
        description: 'Replaces all parameter assignments for a machine with fine-grained `is_production` and `is_barcode` flags. **Roles:** `plant_head`, `it_admin`',
        operationId: 'updateMachineParameters',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Machine ID' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateMachineParametersRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Parameters updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/MachineResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Items ──────────────────────────────────────────────────────────
    '/api/items': {
      get: {
        tags:        ['Items'],
        summary:     'List all items',
        description: 'Returns all items (parts/materials). Any authenticated user can call this.',
        operationId: 'getAllItems',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'is_active', in: 'query', schema: { type: 'boolean' },                                                             description: 'Filter by active status' },
          { name: 'category',  in: 'query', schema: { type: 'string', enum: ['Raw Material', 'Component', 'Finished Good', 'Consumable'] }, description: 'Filter by category' },
          { name: 'search',    in: 'query', schema: { type: 'string' },                                                              description: 'Search by name, code, or HSN code' },
        ],
        responses: {
          200: {
            description: 'Item list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/ItemResponse' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      post: {
        tags:        ['Items'],
        summary:     'Create item',
        description: 'Auto-generates `code` from name (first 3 letters + sequence). **Roles:** `plant_head`, `it_admin`',
        operationId: 'createItem',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateItemRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Item created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Item "Steel Shaft" created successfully' },
                    data:    { $ref: '#/components/schemas/ItemResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',             content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          409: { description: 'Duplicate code',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/items/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Item ID' },
      ],

      get: {
        tags:        ['Items'],
        summary:     'Get item by ID',
        operationId: 'getItemById',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Item details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/ItemResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          404: { description: 'Not found',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      patch: {
        tags:        ['Items'],
        summary:     'Update item',
        description: 'Partial update. `code` and audit fields are read-only. **Roles:** `plant_head`, `it_admin`',
        operationId: 'updateItem',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateItemRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Item updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string',  example: 'Item updated successfully' },
                    data:    { $ref: '#/components/schemas/ItemResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      delete: {
        tags:        ['Items'],
        summary:     'Delete item',
        description: 'Permanently deletes the item. **Roles:** `plant_head`, `it_admin`',
        operationId: 'deleteItem',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Item deleted',       content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    // ── Production Parameters ──────────────────────────────────────────
    '/api/production-parameters': {
      get: {
        tags:        ['ProductionParameters'],
        summary:     'List all production parameters',
        description: 'Returns all active production parameters. Any authenticated user can call this.',
        operationId: 'getAllProductionParameters',
        security:    [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Parameter list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/ProductionParameterResponse' } },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },

      post: {
        tags:        ['ProductionParameters'],
        summary:     'Create production parameter',
        description: 'For `derived` type, provide `formula` and optionally `ctq`. **Roles:** `plant_head`, `it_admin`',
        operationId: 'createProductionParameter',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateProductionParameterRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Parameter created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { $ref: '#/components/schemas/ProductionParameterResponse' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',             content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/production-parameters/bulk': {
      post: {
        tags:        ['ProductionParameters'],
        summary:     'Bulk create production parameters',
        description: 'Creates multiple parameters at once. **Roles:** `plant_head`, `it_admin`',
        operationId: 'bulkCreateProductionParameters',
        security:    [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/BulkCreateProductionParametersRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Parameters created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data:    { type: 'array', items: { $ref: '#/components/schemas/ProductionParameterResponse' } },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error',     content: { 'application/json': { schema: { $ref: '#/components/schemas/Error400' } } } },
          401: { description: 'Unauthorized',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',             content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },

    '/api/production-parameters/{id}': {
      delete: {
        tags:        ['ProductionParameters'],
        summary:     'Delete production parameter',
        description: 'Soft-deletes the parameter by setting `is_active = false`. **Roles:** `plant_head`, `it_admin`',
        operationId: 'deleteProductionParameter',
        security:    [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Parameter ID' },
        ],
        responses: {
          200: { description: 'Parameter deleted',  content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
          401: { description: 'Unauthorized',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error401' } } } },
          403: { description: 'Forbidden',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error403' } } } },
          404: { description: 'Not found',          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error404' } } } },
          500: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error500' } } } },
        },
      },
    },
    // ── Work Orders ─────────────────────────────────────────────────────────
    '/api/work-orders': {
      get: {
        tags: ['WorkOrders'], summary: 'List work orders', operationId: 'getAllWorkOrders',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search',     in: 'query', schema: { type: 'string' },  description: 'Search by WO number' },
          { name: 'status',     in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'machine_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by machine' },
          { name: 'item_id',    in: 'query', schema: { type: 'integer' }, description: 'Filter by item' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/WorkOrderResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['WorkOrders'], summary: 'Create work order', operationId: 'createWorkOrder',
        description: '**Roles:** production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateWorkOrderRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/WorkOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/work-orders/{id}': {
      get: {
        tags: ['WorkOrders'], summary: 'Get work order by ID', operationId: 'getWorkOrderById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/WorkOrderResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['WorkOrders'], summary: 'Update work order', operationId: 'updateWorkOrder',
        description: '**Roles:** production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateWorkOrderRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/WorkOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['WorkOrders'], summary: 'Delete work order (draft only)', operationId: 'deleteWorkOrder',
        description: '**Roles:** production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/work-orders/{id}/status': {
      patch: {
        tags: ['WorkOrders'], summary: 'Update work order status', operationId: 'updateWorkOrderStatus',
        description: 'Valid transitions: draft→open, open→in_progress/on_hold/cancelled, in_progress→completed/on_hold/cancelled. **Roles:** production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/UpdateWorkOrderStatusRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/WorkOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Job Cards ────────────────────────────────────────────────────────────
    '/api/job-cards': {
      get: {
        tags: ['JobCards'], summary: 'List job cards', operationId: 'getAllJobCards',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'work_order_id', in: 'query', schema: { type: 'string' },  description: 'Filter by work order UUID' },
          { name: 'status',        in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/JobCardResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['JobCards'], summary: 'Create job card', operationId: 'createJobCard',
        description: '**Roles:** production_manager, production_incharge, operator, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateJobCardRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/JobCardResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/job-cards/{id}': {
      get: {
        tags: ['JobCards'], summary: 'Get job card by ID', operationId: 'getJobCardById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/JobCardResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['JobCards'], summary: 'Update job card', operationId: 'updateJobCard',
        description: '**Roles:** production_manager, production_incharge, operator, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateJobCardRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/JobCardResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['JobCards'], summary: 'Delete job card', operationId: 'deleteJobCard',
        description: '**Roles:** production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── LQC Inspections ──────────────────────────────────────────────────────
    '/api/lqc-inspections': {
      get: {
        tags: ['LqcInspections'], summary: 'List LQC inspections', operationId: 'getAllLqcInspections',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'reference_type', in: 'query', schema: { type: 'string' }, description: 'job_card / work_order / production_schedule' },
          { name: 'reference_id',   in: 'query', schema: { type: 'string' }, description: 'UUID of related record' },
          { name: 'result',         in: 'query', schema: { type: 'string' }, description: 'pass / fail / na' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/LqcInspectionResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['LqcInspections'], summary: 'Record LQC inspection', operationId: 'createLqcInspection',
        description: '**Roles:** quality_manager, quality_incharge, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateLqcInspectionRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/LqcInspectionResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/lqc-inspections/{id}': {
      get: {
        tags: ['LqcInspections'], summary: 'Get LQC inspection by ID', operationId: 'getLqcInspectionById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/LqcInspectionResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['LqcInspections'], summary: 'Delete LQC inspection', operationId: 'deleteLqcInspection',
        description: '**Roles:** quality_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/lqc-inspections/{id}/result': {
      patch: {
        tags: ['LqcInspections'], summary: 'Update inspection result', operationId: 'updateLqcResult',
        description: '**Roles:** quality_manager, quality_incharge, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateLqcInspectionRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/LqcInspectionResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Production Schedules ─────────────────────────────────────────────────
    '/api/production-schedules': {
      get: {
        tags: ['ProductionSchedules'], summary: 'List production schedules', operationId: 'getAllProductionSchedules',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status',     in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'machine_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by machine' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/ProductionScheduleResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['ProductionSchedules'], summary: 'Create production schedule', operationId: 'createProductionSchedule',
        description: '**Roles:** planning_manager, planning_incharge, production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateProductionScheduleRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ProductionScheduleResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/production-schedules/{id}': {
      get: {
        tags: ['ProductionSchedules'], summary: 'Get production schedule by ID', operationId: 'getProductionScheduleById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ProductionScheduleResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['ProductionSchedules'], summary: 'Update production schedule', operationId: 'updateProductionSchedule',
        description: '**Roles:** planning_manager, planning_incharge, production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateProductionScheduleRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ProductionScheduleResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['ProductionSchedules'], summary: 'Delete production schedule (draft only)', operationId: 'deleteProductionSchedule',
        description: '**Roles:** planning_manager, production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/production-schedules/{id}/publish': {
      patch: {
        tags: ['ProductionSchedules'], summary: 'Publish production schedule', operationId: 'publishProductionSchedule',
        description: 'Transitions schedule from draft to published. **Roles:** planning_manager, production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ProductionScheduleResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Scrap Vouchers ───────────────────────────────────────────────────────
    '/api/scrap-vouchers': {
      get: {
        tags: ['ScrapVouchers'], summary: 'List scrap vouchers', operationId: 'getAllScrapVouchers',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status',        in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'work_order_id', in: 'query', schema: { type: 'string' },  description: 'Filter by work order UUID' },
          { name: 'item_id',       in: 'query', schema: { type: 'integer' }, description: 'Filter by item' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/ScrapVoucherResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['ScrapVouchers'], summary: 'Create scrap voucher', operationId: 'createScrapVoucher',
        description: '**Roles:** production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateScrapVoucherRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ScrapVoucherResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/scrap-vouchers/{id}': {
      get: {
        tags: ['ScrapVouchers'], summary: 'Get scrap voucher by ID', operationId: 'getScrapVoucherById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ScrapVoucherResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['ScrapVouchers'], summary: 'Update scrap voucher (pending only)', operationId: 'updateScrapVoucher',
        description: '**Roles:** production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateScrapVoucherRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ScrapVoucherResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['ScrapVouchers'], summary: 'Delete scrap voucher (pending only)', operationId: 'deleteScrapVoucher',
        description: '**Roles:** production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/scrap-vouchers/{id}/authorize': {
      patch: {
        tags: ['ScrapVouchers'], summary: 'Approve scrap voucher', operationId: 'authorizeScrapVoucher',
        description: '**Roles:** production_manager, quality_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ScrapVoucherResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/scrap-vouchers/{id}/reject': {
      patch: {
        tags: ['ScrapVouchers'], summary: 'Reject scrap voucher', operationId: 'rejectScrapVoucher',
        description: '**Roles:** production_manager, quality_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/ScrapVoucherResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Purchase Orders ──────────────────────────────────────────────────────
    '/api/purchase-orders': {
      get: {
        tags: ['PurchaseOrders'], summary: 'List purchase orders', operationId: 'getAllPurchaseOrders',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'vendor_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by vendor' },
          { name: 'status',    in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/PurchaseOrderResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['PurchaseOrders'], summary: 'Create purchase order', operationId: 'createPurchaseOrder',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreatePurchaseOrderRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/PurchaseOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/purchase-orders/{id}': {
      get: {
        tags: ['PurchaseOrders'], summary: 'Get purchase order by ID', operationId: 'getPurchaseOrderById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/PurchaseOrderResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['PurchaseOrders'], summary: 'Update purchase order (draft only)', operationId: 'updatePurchaseOrder',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreatePurchaseOrderRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/PurchaseOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['PurchaseOrders'], summary: 'Delete purchase order (draft only)', operationId: 'deletePurchaseOrder',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/purchase-orders/{id}/receive': {
      patch: {
        tags: ['PurchaseOrders'], summary: 'Receive goods against PO', operationId: 'receivePurchaseOrder',
        description: 'Records received quantities per line item. **Roles:** store_manager, store_incharge, procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ReceivePurchaseOrderRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/PurchaseOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Subcontract Challans ─────────────────────────────────────────────────
    '/api/subcontract-challans': {
      get: {
        tags: ['SubcontractChallans'], summary: 'List subcontract challans', operationId: 'getAllSubcontractChallans',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'type',          in: 'query', schema: { type: 'string' },  description: 'outward / inward' },
          { name: 'vendor_id',     in: 'query', schema: { type: 'integer' }, description: 'Filter by vendor' },
          { name: 'status',        in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'work_order_id', in: 'query', schema: { type: 'string' },  description: 'Filter by work order UUID' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/SubcontractChallanResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['SubcontractChallans'], summary: 'Create subcontract challan', operationId: 'createSubcontractChallan',
        description: '**Roles:** production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateSubcontractChallanRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/SubcontractChallanResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/subcontract-challans/{id}': {
      get: {
        tags: ['SubcontractChallans'], summary: 'Get challan by ID', operationId: 'getSubcontractChallanById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/SubcontractChallanResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['SubcontractChallans'], summary: 'Delete challan (pending only)', operationId: 'deleteSubcontractChallan',
        description: '**Roles:** production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/subcontract-challans/{id}/receive': {
      patch: {
        tags: ['SubcontractChallans'], summary: 'Mark challan as received', operationId: 'receiveSubcontractChallan',
        description: 'Only outward challans can be received. **Roles:** production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/SubcontractChallanResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/subcontract-challans/{id}/cancel': {
      patch: {
        tags: ['SubcontractChallans'], summary: 'Cancel subcontract challan', operationId: 'cancelSubcontractChallan',
        description: 'Cannot cancel a received challan. **Roles:** production_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/SubcontractChallanResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── RFQs ────────────────────────────────────────────────────────────────
    '/api/rfqs': {
      get: {
        tags: ['RFQs'], summary: 'List RFQs', operationId: 'getAllRfqs',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status',    in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'vendor_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by vendor' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/RfqResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['RFQs'], summary: 'Create RFQ', operationId: 'createRfq',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateRfqRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/RfqResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/rfqs/{id}': {
      get: {
        tags: ['RFQs'], summary: 'Get RFQ by ID', operationId: 'getRfqById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/RfqResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['RFQs'], summary: 'Update RFQ', operationId: 'updateRfq',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateRfqRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/RfqResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['RFQs'], summary: 'Delete RFQ (draft only)', operationId: 'deleteRfq',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Quotations ───────────────────────────────────────────────────────────
    '/api/quotations': {
      get: {
        tags: ['Quotations'], summary: 'List quotations', operationId: 'getAllQuotations',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'rfq_id',    in: 'query', schema: { type: 'string' },  description: 'Filter by RFQ UUID' },
          { name: 'vendor_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by vendor' },
          { name: 'status',    in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/QuotationResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['Quotations'], summary: 'Create quotation', operationId: 'createQuotation',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateQuotationRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/QuotationResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/quotations/{id}': {
      get: {
        tags: ['Quotations'], summary: 'Get quotation by ID', operationId: 'getQuotationById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/QuotationResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['Quotations'], summary: 'Update quotation', operationId: 'updateQuotation',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateQuotationRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/QuotationResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['Quotations'], summary: 'Delete quotation (draft only)', operationId: 'deleteQuotation',
        description: '**Roles:** procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Customer Orders ──────────────────────────────────────────────────────
    '/api/customer-orders': {
      get: {
        tags: ['CustomerOrders'], summary: 'List customer orders', operationId: 'getAllCustomerOrders',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status',        in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'customer_name', in: 'query', schema: { type: 'string' }, description: 'Search by customer name' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/CustomerOrderResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['CustomerOrders'], summary: 'Create customer order', operationId: 'createCustomerOrder',
        description: '**Roles:** planning_manager, procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateCustomerOrderRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/CustomerOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/customer-orders/{id}': {
      get: {
        tags: ['CustomerOrders'], summary: 'Get customer order by ID', operationId: 'getCustomerOrderById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/CustomerOrderResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['CustomerOrders'], summary: 'Update customer order', operationId: 'updateCustomerOrder',
        description: '**Roles:** planning_manager, procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateCustomerOrderRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/CustomerOrderResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['CustomerOrders'], summary: 'Delete customer order (draft only)', operationId: 'deleteCustomerOrder',
        description: '**Roles:** planning_manager, procurement_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── GRNs ─────────────────────────────────────────────────────────────────
    '/api/grns': {
      get: {
        tags: ['GRNs'], summary: 'List GRNs', operationId: 'getAllGrns',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'vendor_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by vendor' },
          { name: 'status',    in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'po_id',     in: 'query', schema: { type: 'string' },  description: 'Filter by PO UUID' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/GrnResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['GRNs'], summary: 'Create GRN', operationId: 'createGrn',
        description: '**Roles:** store_manager, store_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateGrnRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/GrnResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/grns/{id}': {
      get: {
        tags: ['GRNs'], summary: 'Get GRN by ID', operationId: 'getGrnById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/GrnResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['GRNs'], summary: 'Update GRN (draft only)', operationId: 'updateGrn',
        description: '**Roles:** store_manager, store_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateGrnRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/GrnResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['GRNs'], summary: 'Delete GRN (draft only)', operationId: 'deleteGrn',
        description: '**Roles:** store_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Material Requests ────────────────────────────────────────────────────
    '/api/material-requests': {
      get: {
        tags: ['MaterialRequests'], summary: 'List material requests', operationId: 'getAllMaterialRequests',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status',       in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'warehouse_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by warehouse' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/MaterialRequestResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['MaterialRequests'], summary: 'Create material request', operationId: 'createMaterialRequest',
        description: '**Roles:** store_manager, store_incharge, production_manager, production_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateMaterialRequestRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/MaterialRequestResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/material-requests/{id}': {
      get: {
        tags: ['MaterialRequests'], summary: 'Get material request by ID', operationId: 'getMaterialRequestById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/MaterialRequestResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['MaterialRequests'], summary: 'Update material request (draft only)', operationId: 'updateMaterialRequest',
        description: '**Roles:** store_manager, store_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateMaterialRequestRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/MaterialRequestResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['MaterialRequests'], summary: 'Delete material request (draft only)', operationId: 'deleteMaterialRequest',
        description: '**Roles:** store_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/material-requests/{id}/approve': {
      patch: {
        tags: ['MaterialRequests'], summary: 'Approve material request', operationId: 'approveMaterialRequest',
        description: '**Roles:** store_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/MaterialRequestResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/material-requests/{id}/reject': {
      patch: {
        tags: ['MaterialRequests'], summary: 'Reject material request', operationId: 'rejectMaterialRequest',
        description: '**Roles:** store_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/MaterialRequestResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Issue Slips ──────────────────────────────────────────────────────────
    '/api/issue-slips': {
      get: {
        tags: ['IssueSlips'], summary: 'List issue slips', operationId: 'getAllIssueSlips',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'mr_id',        in: 'query', schema: { type: 'string' },  description: 'Filter by material request UUID' },
          { name: 'warehouse_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by warehouse' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/IssueSlipResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['IssueSlips'], summary: 'Create issue slip', operationId: 'createIssueSlip',
        description: '**Roles:** store_manager, store_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateIssueSlipRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/IssueSlipResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/issue-slips/{id}': {
      get: {
        tags: ['IssueSlips'], summary: 'Get issue slip by ID', operationId: 'getIssueSlipById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/IssueSlipResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['IssueSlips'], summary: 'Delete issue slip', operationId: 'deleteIssueSlip',
        description: 'Issue slips are immutable — only admins can delete. **Roles:** store_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },

    // ── Stock Adjustments ────────────────────────────────────────────────────
    '/api/stock-adjustments': {
      get: {
        tags: ['StockAdjustments'], summary: 'List stock adjustments', operationId: 'getAllStockAdjustments',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status',       in: 'query', schema: { type: 'string' },  description: 'Filter by status' },
          { name: 'warehouse_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by warehouse' },
        ],
        responses: { 200: { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/StockAdjustmentResponse' } } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      post: {
        tags: ['StockAdjustments'], summary: 'Create stock adjustment', operationId: 'createStockAdjustment',
        description: '**Roles:** store_manager, store_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateStockAdjustmentRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/StockAdjustmentResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },
    '/api/stock-adjustments/{id}': {
      get: {
        tags: ['StockAdjustments'], summary: 'Get stock adjustment by ID', operationId: 'getStockAdjustmentById',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/StockAdjustmentResponse' } } } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      patch: {
        tags: ['StockAdjustments'], summary: 'Update stock adjustment (draft only)', operationId: 'updateStockAdjustment',
        description: '**Roles:** store_manager, store_incharge, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/CreateStockAdjustmentRequest' } } } },
        responses: { 200: { description: 'Record', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { '$ref': '#/components/schemas/StockAdjustmentResponse' } } } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
      delete: {
        tags: ['StockAdjustments'], summary: 'Delete stock adjustment (draft only)', operationId: 'deleteStockAdjustment',
        description: '**Roles:** store_manager, plant_head, it_admin',
        security: [{ BearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Record UUID' }],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { '$ref': '#/components/schemas/SuccessMessage' } } } }, 400: { description: 'Validation error',    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error400' } } } }, 401: { description: 'Unauthorized',        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error401' } } } }, 403: { description: 'Forbidden',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error403' } } } }, 404: { description: 'Not found',           content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error404' } } } }, 500: { description: 'Internal server error', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error500' } } } } },
      },
    },


    // ─────────────────────────────────────────────────────────────────────────
    // Sprint 4 — Quality: CAPA
    // ─────────────────────────────────────────────────────────────────────────

    '/quality/capa': {
      get: {
        tags: ['Capa'], summary: 'List all CAPAs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'search',      schema: { type: 'string' } },
          { in: 'query', name: 'status',      schema: { type: 'string' } },
          { in: 'query', name: 'source_type', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/Capa' } } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      post: {
        tags: ['Capa'], summary: 'Create CAPA (D0 + D1)',
        description: 'Roles: plant_head, it_admin, quality_manager, quality_incharge',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['problem_title'],
          properties: {
            problem_title: { type: 'string' },
            problem_desc:  { type: 'string' },
            source_type:   { type: 'string' },
            source_id:     { type: 'string', format: 'uuid' },
            champion_id:   { type: 'integer' },
            target_date:   { type: 'string', format: 'date' },
            team_members:  { type: 'array', items: { '$ref': '#/components/schemas/CapaTeamMember' } },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Capa' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/capa/{id}': {
      get: {
        tags: ['Capa'], summary: 'Get CAPA by ID with full details',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Capa' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      patch: {
        tags: ['Capa'], summary: 'Update CAPA general fields',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Capa' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      delete: {
        tags: ['Capa'], summary: 'Delete draft CAPA',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/capa/{id}/d4': {
      put: {
        tags: ['Capa'], summary: 'Save D4 — Root Causes (5-Why) + Fishbone (6M)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            containment_action: { type: 'string' },
            containment_date:   { type: 'string', format: 'date' },
            root_causes: { type: 'array', items: { '$ref': '#/components/schemas/CapaRootCause' } },
            fishbone:    { type: 'array', items: { '$ref': '#/components/schemas/CapaFishbone' } },
          },
        } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Capa' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/capa/{id}/d5d6': {
      put: {
        tags: ['Capa'], summary: 'Save D5/D6 — Corrective & Preventive Actions',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            prevention_action: { type: 'string' },
            actions: { type: 'array', items: { '$ref': '#/components/schemas/CapaAction' } },
          },
        } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Capa' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/capa/{id}/effectiveness': {
      post: {
        tags: ['Capa'], summary: 'Record effectiveness check (30/60/90 days)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['check_period', 'check_date', 'is_effective'],
          properties: {
            check_period:     { type: 'integer', enum: [30, 60, 90] },
            check_date:       { type: 'string', format: 'date' },
            is_effective:     { type: 'boolean' },
            recurrence_found: { type: 'boolean' },
            evidence:         { type: 'string' },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/CapaEffectiveness' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/capa/{id}/close': {
      patch: {
        tags: ['Capa'], summary: 'Close CAPA (D8)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { closure_notes: { type: 'string' } } } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Capa' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Sprint 4 — Quality: NCR
    // ─────────────────────────────────────────────────────────────────────────

    '/quality/ncr': {
      get: {
        tags: ['Ncr'], summary: 'List all NCRs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'search',         schema: { type: 'string' } },
          { in: 'query', name: 'status',          schema: { type: 'string' } },
          { in: 'query', name: 'ncr_type',        schema: { type: 'string' } },
          { in: 'query', name: 'location_found',  schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/Ncr' } } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      post: {
        tags: ['Ncr'], summary: 'Raise a new NCR',
        description: 'Roles: plant_head, it_admin, quality_manager, quality_incharge',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['ncr_type', 'item_id', 'defect_desc', 'location_found'],
          properties: {
            ncr_type:       { type: 'string', enum: ['dimensional','visual','material','process','documentation'] },
            item_id:        { type: 'integer' },
            defect_desc:    { type: 'string' },
            location_found: { type: 'string', enum: ['iqc','lqc','pqc','oqc','production','store'] },
            lot_no:         { type: 'string' },
            qty_affected:   { type: 'number' },
            cost_per_unit:  { type: 'number' },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Ncr' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/ncr/{id}': {
      get: {
        tags: ['Ncr'], summary: 'Get NCR by ID with disposition',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Ncr' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      patch: {
        tags: ['Ncr'], summary: 'Update NCR',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Ncr' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      delete: {
        tags: ['Ncr'], summary: 'Delete NCR (raised status only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/ncr/{id}/disposition': {
      post: {
        tags: ['Ncr'], summary: 'Record MRB disposition decision',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['decision'],
          properties: {
            decision:            { type: 'string', enum: ['use_as_is','rework','scrap','return_to_supplier','sort_and_use'] },
            reason:              { type: 'string' },
            rework_notes:        { type: 'string' },
            material_hold_notes: { type: 'string' },
          },
        } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/NcrDisposition' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/ncr/{id}/close': {
      patch: {
        tags: ['Ncr'], summary: 'Close NCR after disposition',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Sprint 4 — Quality: Complaints
    // ─────────────────────────────────────────────────────────────────────────

    '/quality/complaints': {
      get: {
        tags: ['Complaints'], summary: 'List all customer complaints',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'search',        schema: { type: 'string' } },
          { in: 'query', name: 'status',        schema: { type: 'string' } },
          { in: 'query', name: 'customer_name', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/Complaint' } } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      post: {
        tags: ['Complaints'], summary: 'Register new customer complaint',
        description: 'Roles: plant_head, it_admin, quality_manager, quality_incharge',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['customer_name', 'item_id', 'defect_desc'],
          properties: {
            customer_name: { type: 'string' },
            customer_ref:  { type: 'string' },
            item_id:       { type: 'integer' },
            defect_desc:   { type: 'string' },
            qty_affected:  { type: 'number' },
            delivery_date: { type: 'string', format: 'date' },
            response_due:  { type: 'string', format: 'date' },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Complaint' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/complaints/{id}': {
      get: {
        tags: ['Complaints'], summary: 'Get complaint by ID with linked CAPA',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Complaint' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      patch: {
        tags: ['Complaints'], summary: 'Update complaint',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Complaint' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      delete: {
        tags: ['Complaints'], summary: 'Delete complaint (received status only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/quality/complaints/{id}/acknowledge': {
      patch: {
        tags: ['Complaints'], summary: 'Acknowledge complaint and set response due date',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['response_due'],
          properties: {
            response_due: { type: 'string', format: 'date' },
            notes:        { type: 'string' },
          },
        } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Complaint' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Sprint 4 — NPD: Drawings
    // ─────────────────────────────────────────────────────────────────────────

    '/npd/drawings': {
      get: {
        tags: ['Drawings'], summary: 'List all drawings',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'search',  schema: { type: 'string' } },
          { in: 'query', name: 'status',  schema: { type: 'string' } },
          { in: 'query', name: 'item_id', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/Drawing' } } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      post: {
        tags: ['Drawings'], summary: 'Create drawing header',
        description: 'Roles: plant_head, it_admin, quality_manager, quality_incharge',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['drawing_no', 'title', 'current_revision'],
          properties: {
            drawing_no:       { type: 'string' },
            title:            { type: 'string' },
            item_id:          { type: 'integer' },
            customer:         { type: 'string' },
            material:         { type: 'string' },
            current_revision: { type: 'string' },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Drawing' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/drawings/{id}': {
      get: {
        tags: ['Drawings'], summary: 'Get drawing by ID with all versions',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Drawing' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      patch: {
        tags: ['Drawings'], summary: 'Update drawing metadata',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Drawing' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      delete: {
        tags: ['Drawings'], summary: 'Delete drawing (uploaded status only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/drawings/{id}/versions': {
      post: {
        tags: ['Drawings'], summary: 'Upload new drawing version (revision)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['revision', 'file_path', 'file_name'],
          properties: {
            revision:    { type: 'string' },
            file_path:   { type: 'string' },
            file_name:   { type: 'string' },
            file_size:   { type: 'integer' },
            change_desc: { type: 'string' },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/DrawingVersion' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/drawings/{id}/approve': {
      patch: {
        tags: ['Drawings'], summary: 'Approve and release drawing',
        description: 'Roles: plant_head, it_admin, quality_manager',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Drawing' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/drawings/{id}/obsolete': {
      patch: {
        tags: ['Drawings'], summary: 'Mark drawing as obsolete',
        description: 'Roles: plant_head, it_admin, quality_manager',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Drawing' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Sprint 4 — NPD: Check-Sheets
    // ─────────────────────────────────────────────────────────────────────────

    '/npd/check-sheets': {
      get: {
        tags: ['CheckSheets'], summary: 'List all check-sheet templates',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'search',    schema: { type: 'string' } },
          { in: 'query', name: 'item_id',   schema: { type: 'integer' } },
          { in: 'query', name: 'is_active', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/CheckSheetTemplate' } } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      post: {
        tags: ['CheckSheets'], summary: 'Create check-sheet template with dimensions',
        description: 'Roles: plant_head, it_admin, quality_manager, quality_incharge',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['drawing_id', 'item_id', 'name', 'revision'],
          properties: {
            drawing_id:       { type: 'string', format: 'uuid' },
            item_id:          { type: 'integer' },
            name:             { type: 'string' },
            revision:         { type: 'string' },
            applicable_gates: { type: 'array', items: { type: 'string' } },
            dimensions:       { type: 'array', items: { '$ref': '#/components/schemas/CheckSheetDimension' } },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/CheckSheetTemplate' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/check-sheets/{id}': {
      get: {
        tags: ['CheckSheets'], summary: 'Get check-sheet template with dimensions',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/CheckSheetTemplate' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      patch: {
        tags: ['CheckSheets'], summary: 'Update check-sheet template header',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/CheckSheetTemplate' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      delete: {
        tags: ['CheckSheets'], summary: 'Delete check-sheet template and dimensions',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/check-sheets/{id}/dimensions': {
      put: {
        tags: ['CheckSheets'], summary: 'Replace all dimensions for a check-sheet template',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['dimensions'],
          properties: { dimensions: { type: 'array', items: { '$ref': '#/components/schemas/CheckSheetDimension' } } },
        } } } },
        responses: { '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/CheckSheetDimension' } } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Sprint 4 — NPD: PFMEA
    // ─────────────────────────────────────────────────────────────────────────

    '/npd/pfmea': {
      get: {
        tags: ['Pfmea'], summary: 'List all PFMEAs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'search',  schema: { type: 'string' } },
          { in: 'query', name: 'status',  schema: { type: 'string' } },
          { in: 'query', name: 'item_id', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { '$ref': '#/components/schemas/Pfmea' } } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      post: {
        tags: ['Pfmea'], summary: 'Create new PFMEA',
        description: 'Roles: plant_head, it_admin, quality_manager, quality_incharge',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['item_id', 'title'],
          properties: {
            item_id:       { type: 'integer' },
            drawing_id:    { type: 'string', format: 'uuid' },
            title:         { type: 'string' },
            revision:      { type: 'string' },
            document_date: { type: 'string', format: 'date' },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Pfmea' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/pfmea/{id}': {
      get: {
        tags: ['Pfmea'], summary: 'Get PFMEA by ID with items and actions',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Pfmea' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      patch: {
        tags: ['Pfmea'], summary: 'Update PFMEA header',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/Pfmea' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      delete: {
        tags: ['Pfmea'], summary: 'Delete draft PFMEA',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/pfmea/{id}/items': {
      post: {
        tags: ['Pfmea'], summary: 'Add process step / failure mode item to PFMEA',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['process_step', 'failure_mode', 'failure_effect', 'failure_cause', 'severity', 'occurrence', 'detection'],
          properties: {
            process_step:     { type: 'string' },
            failure_mode:     { type: 'string' },
            failure_effect:   { type: 'string' },
            failure_cause:    { type: 'string' },
            severity:         { type: 'integer', minimum: 1, maximum: 10 },
            occurrence:       { type: 'integer', minimum: 1, maximum: 10 },
            detection:        { type: 'integer', minimum: 1, maximum: 10 },
            current_controls: { type: 'string' },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/PfmeaItem' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/pfmea/items/{itemId}': {
      patch: {
        tags: ['Pfmea'], summary: 'Update PFMEA item (AP auto-recalculated)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'itemId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/PfmeaItem' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
      delete: {
        tags: ['Pfmea'], summary: 'Delete PFMEA item and its actions',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'itemId', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/pfmea/items/{itemId}/actions': {
      post: {
        tags: ['Pfmea'], summary: 'Add recommended action for a PFMEA item',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'itemId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['action_desc'],
          properties: {
            action_desc:      { type: 'string' },
            responsible_id:   { type: 'integer' },
            target_date:      { type: 'string', format: 'date' },
            severity_after:   { type: 'integer', minimum: 1, maximum: 10 },
            occurrence_after: { type: 'integer', minimum: 1, maximum: 10 },
            detection_after:  { type: 'integer', minimum: 1, maximum: 10 },
          },
        } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/PfmeaAction' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },

    '/npd/pfmea/actions/{actionId}': {
      patch: {
        tags: ['Pfmea'], summary: 'Update PFMEA action (AP-after auto-recalculated)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'actionId', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { '$ref': '#/components/schemas/PfmeaAction' } } } } } },         '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden' },
        '404': { description: 'Not found' },
        '500': { description: 'Server error' }, },
      },
    },
  },
};

module.exports = swaggerSpec;
