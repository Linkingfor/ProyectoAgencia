const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ventas.controller');
const { verifyToken, soloTrabajador } = require('../middleware/auth');

// ── Accesibles a trabajadores y al cliente dueño ──
router.get ('/correo/estado',      verifyToken, ctrl.estadoCorreo);   // ¿está configurado el envío?
router.get ('/:id/pdf',            verifyToken, ctrl.downloadPdf);    // descargar comprobante
router.post('/:id/enviar-correo',  verifyToken, ctrl.enviarCorreo);  // enviar comprobante por correo

// ── El resto del módulo es solo intranet ──
router.use(verifyToken, soloTrabajador);
router.get ('/',     ctrl.getAll);
router.get ('/:id',  ctrl.getById);
router.post('/',     ctrl.create);

module.exports = router;
