const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cliente.controller');
const { verifyToken, soloCliente } = require('../middleware/auth');

router.use(verifyToken, soloCliente);
router.get ('/reservas', ctrl.misReservas);
router.get ('/compras',  ctrl.misCompras);
router.post('/comprar',  ctrl.comprarOnline);

module.exports = router;
