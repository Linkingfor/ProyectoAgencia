const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reservas.controller');
const { verifyToken, soloTrabajador } = require('../middleware/auth');

router.use(verifyToken, soloTrabajador);
router.get   ('/disponibilidad', ctrl.checkDisponibilidad);
router.get   ('/',               ctrl.getAll);
router.get   ('/:id',            ctrl.getById);
router.post  ('/',               ctrl.create);
router.patch ('/:id/estado',     ctrl.updateEstado);
router.patch ('/:id/salida',     ctrl.asignarSalida);
router.delete('/:id',            ctrl.remove);

module.exports = router;
