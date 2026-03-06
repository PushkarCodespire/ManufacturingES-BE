const express = require('express');
const router = express.Router();

const authRoutes         = require('./auth.routes');
const userRoutes         = require('./user.routes');
const auditRoutes        = require('./audit.routes');
const notificationRoutes = require('./notification.routes');
const siteRoutes         = require('./site.routes');
const shiftRoutes        = require('./shift.routes');
const warehouseRoutes    = require('./warehouse.routes');
const machineRoutes              = require('./machine.routes');
const itemRoutes                 = require('./item.routes');
const productionParameterRoutes  = require('./productionParameter.routes');
const tagRoutes                  = require('./tag.routes');

// Mount routes
router.use('/auth',          authRoutes);
router.use('/users',         userRoutes);
router.use('/audit',         auditRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sites',         siteRoutes);
router.use('/shifts',        shiftRoutes);
router.use('/warehouses',    warehouseRoutes);
router.use('/machines',              machineRoutes);
router.use('/items',                 itemRoutes);
router.use('/production-parameters', productionParameterRoutes);
router.use('/tags',                  tagRoutes);

module.exports = router;
