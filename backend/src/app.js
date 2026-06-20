const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes         = require('./routes/auth.routes');
const clientesRoutes     = require('./routes/clientes.routes');
const trabajadoresRoutes = require('./routes/trabajadores.routes');
const serviciosRoutes    = require('./routes/servicios.routes');
const publicRoutes       = require('./routes/public.routes');
const transporteRoutes   = require('./routes/transporte.routes');
const salidasRoutes      = require('./routes/salidas.routes');
const reservasRoutes     = require('./routes/reservas.routes');
const asignacionRoutes   = require('./routes/asignacion.routes');
const ventasRoutes       = require('./routes/ventas.routes');
const reportesRoutes     = require('./routes/reportes.routes');
const clienteRoutes = require('./routes/cliente.routes');

const app = express();

// ─── Seguridad / RNF-01 ────────────────────────────────────────────────────
// helmet: cabeceras de seguridad HTTP (XSS, clickjacking, sniffing, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },  // permite servir PDFs al frontend
}));

// CORS restringido al frontend de desarrollo
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiters / RFC-007 ────────────────────────────────────────────────
// General: 300 req / 15 min por IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' }
}));

// Estricto en logins: bloquea IP tras 5 intentos fallidos por 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos. Bloqueado 15 minutos.' }
});
app.use('/api/auth/login', loginLimiter);

// ─── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/clientes',     clientesRoutes);
app.use('/api/trabajadores', trabajadoresRoutes);
app.use('/api/servicios',    serviciosRoutes);
app.use('/api/public',       publicRoutes);
app.use('/api/transporte',   transporteRoutes);
app.use('/api/salidas',      salidasRoutes);
app.use('/api/reservas',     reservasRoutes);
app.use('/api/asignaciones', asignacionRoutes);
app.use('/api/ventas',       ventasRoutes);
app.use('/api/reportes',     reportesRoutes);
app.use('/api/mi-cuenta', clienteRoutes);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({ mensaje: 'API Agencia de Viajes Ica ✅', version: '5.0.0', sprint: 5 });
});

// ─── Manejo de errores global ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;
