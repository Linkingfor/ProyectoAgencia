const express = require('express');
const router = express.Router();
const servicios = require('../controllers/servicios.controller');

// Rutas públicas — página comercial (sin autenticación)
router.get('/catalogo', servicios.getCatalogo);

module.exports = router;
