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
const vendorRoutes               = require('./vendor.routes');
const vendorCostingRoutes        = require('./vendorCosting.routes');
const customFieldGroupRoutes     = require('./customFieldGroup.routes');
const integrationRoutes          = require('./integration.routes');
const stickerTemplateRoutes      = require('./stickerTemplate.routes');
const templateRoutes             = require('./template.routes');
const productionFormRoutes       = require('./productionForm.routes');

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
router.use('/vendors',               vendorRoutes);
router.use('/vendor-costings',       vendorCostingRoutes);
router.use('/custom-field-groups',   customFieldGroupRoutes);
router.use('/integrations',          integrationRoutes);
router.use('/sticker-templates',     stickerTemplateRoutes);
router.use('/templates',             templateRoutes);
router.use('/production-forms',      productionFormRoutes);

module.exports = router;
