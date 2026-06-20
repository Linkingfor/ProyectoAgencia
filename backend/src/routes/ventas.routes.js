const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ventas.controller');
const { verifyToken, soloTrabajador } = require('../middleware/auth');

router.use(verifyToken, soloTrabajador);
router.get ('/',     ctrl.getAll);
router.get ('/:id',  ctrl.getById);
router.post('/',     ctrl.create);
router.get ('/:id/pdf', ctrl.downloadPdf);

module.exports = router;