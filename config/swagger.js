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
    { name: 'Audit',         description: 'Audit log & activity trail (SYS-007)' },
    { name: 'Notifications', description: 'In-app notification bell' },
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
  },
};

module.exports = swaggerSpec;
