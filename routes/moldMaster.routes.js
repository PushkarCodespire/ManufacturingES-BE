const express = require('express');
const router  = express.Router();
const {
  getByQrCode,
  getAll,
  getById,
  create,
  update,
  remove,
  getCategories,
  addPartMapping,
  removePartMapping,
  addMachineCompat,
  uploadDocument,
} = require('../modules/mold/controller/moldMaster.controller');
const { authenticate }  = require('../config/middleware');
const { moldDocUpload } = require('../config/upload');

router.use(authenticate);

router.get( '/scan/:qrCode',              getByQrCode);
router.get( '/categories',                getCategories);
router.get( '/',                           getAll);
router.get( '/:id',                        getById);
router.post('/',                           create);
router.patch('/:id',                       update);
router.delete('/:id',                      remove);
router.post('/:id/part-mappings',          addPartMapping);
router.delete('/:id/part-mappings/:mapId', removePartMapping);
router.post('/:id/machine-compat',         addMachineCompat);
router.post('/:id/documents', moldDocUpload.single('file'), uploadDocument);

module.exports = router;
