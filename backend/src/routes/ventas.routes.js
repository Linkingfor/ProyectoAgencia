const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ventas.controller');
const { verifyToken, soloTrabajador } = require('../middleware/auth');

// El PDF lo pueden descargar tanto trabajadores como el cliente dueño
router.get('/:id/pdf', verifyToken, ctrl.downloadPdf);

// El resto del módulo es solo intranet
router.use(verifyToken, soloTrabajador);
router.get ('/',     ctrl.getAll);
router.get ('/:id',  ctrl.getById);
router.post('/',     ctrl.create);

module.exports = router;
