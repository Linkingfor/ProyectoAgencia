const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientes.controller');
const { verifyToken, soloTrabajador } = require('../middleware/auth');

// Gestión de clientes — solo personal de la intranet
router.use(verifyToken, soloTrabajador);
router.get   ('/',     ctrl.getAll);
router.get   ('/:id',  ctrl.getById);
router.post  ('/',     ctrl.create);
router.put   ('/:id',  ctrl.update);
router.delete('/:id',  ctrl.remove);

module.exports = router;
