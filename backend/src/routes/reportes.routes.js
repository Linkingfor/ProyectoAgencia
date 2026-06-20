const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportes.controller');
const { verifyToken, soloTrabajador } = require('../middleware/auth');

router.use(verifyToken, soloTrabajador);
router.get('/dashboard', ctrl.getDashboard);

module.exports = router;
