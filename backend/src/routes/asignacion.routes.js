const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/asignacion.controller');
const { verifyToken, soloTrabajador } = require('../middleware/auth');

router.use(verifyToken, soloTrabajador);
router.get   ('/',     ctrl.getAll);
router.post  ('/',     ctrl.create);
router.delete('/:id',  ctrl.remove);

module.exports = router;
