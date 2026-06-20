const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');
const { verifyToken, soloTrabajador, verifyPuesto } = require('../middleware/auth');

// ── Intranet (trabajadores) ──
router.post('/login',    auth.loginTrabajador);
router.post('/register', verifyToken, verifyPuesto('administrador'), auth.registerTrabajador);


// ── Común ──
router.get('/me', verifyToken, auth.me);

module.exports = router;
