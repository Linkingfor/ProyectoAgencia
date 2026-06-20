const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');
const { verifyToken, soloTrabajador, verifyPuesto } = require('../middleware/auth');

// ── Intranet (trabajadores) ──
router.post('/login',    auth.loginTrabajador);
router.post('/register', verifyToken, verifyPuesto('administrador'), auth.registerTrabajador);

// ── Página comercial (clientes) ──
router.post('/cliente/login',    auth.loginCliente);
router.post('/cliente/register', auth.registerCliente);   // auto-registro público

// ── Común ──
router.get('/me', verifyToken, auth.me);

module.exports = router;
