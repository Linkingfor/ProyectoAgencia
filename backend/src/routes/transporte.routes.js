const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transporte.controller');
const { verifyToken, soloTrabajador, verifyPuesto } = require('../middleware/auth');

router.use(verifyToken, soloTrabajador);
router.get   ('/',     ctrl.getAll);
router.get   ('/:id',  ctrl.getById);
router.post  ('/',     verifyPuesto('administrador'), ctrl.create);
router.put   ('/:id',  verifyPuesto('administrador'), ctrl.update);
router.delete('/:id',  verifyPuesto('administrador'), ctrl.remove);

module.exports = router;
