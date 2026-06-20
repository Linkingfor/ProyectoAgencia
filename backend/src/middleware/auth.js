/* ════════════════════════════════════════════════════
   Middleware de autenticación
   ════════════════════════════════════════════════════
   Estos "porteros" se ejecutan ANTES de los controladores.
   Su trabajo es leer el token que viene en la cabecera Authorization,
   validarlo, y poner los datos del usuario en `req.user` para que
   el controlador sepa quién está pidiendo la operación.

   Cómo se usa (en las rutas):
     router.use(verifyToken, soloTrabajador);
     router.post('/algo', verifyPuesto('administrador'), controlador);
   ════════════════════════════════════════════════════ */

const jwt = require('jsonwebtoken');

/**
 * Verifica que la petición traiga un token JWT válido.
 * Si todo OK: pone los datos del usuario en req.user y llama a next().
 * Si no: devuelve 401 (sin token) o 403 (token corrupto/expirado).
 */
const verifyToken = (req, res, next) => {
  // El frontend envía: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }
  try {
    // jwt.verify lanza si la firma no calza o si expiró
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

/**
 * Solo permite continuar si el usuario es un TRABAJADOR (intranet).
 * Se usa para proteger todo lo administrativo: clientes, reservas, salidas, etc.
 */
const soloTrabajador = (req, res, next) => {
  if (req.user?.tipo !== 'trabajador') {
    return res.status(403).json({ error: 'Acceso restringido al personal de la agencia.' });
  }
  next();
};

/**
 * Solo permite continuar si el usuario es un CLIENTE (página comercial).
 * Se usa en /api/mi-cuenta/*.
 */
const soloCliente = (req, res, next) => {
  if (req.user?.tipo !== 'cliente') {
    return res.status(403).json({ error: 'Acceso restringido a clientes.' });
  }
  next();
};

/**
 * Filtro fino dentro de la intranet: exige un puesto específico.
 * Ejemplo: verifyPuesto('administrador')  →  solo admins pueden borrar trabajadores.
 */
const verifyPuesto = (...puestos) => (req, res, next) => {
  if (req.user?.tipo !== 'trabajador' || !puestos.includes(req.user.puesto)) {
    return res.status(403).json({ error: `Acceso denegado. Se requiere puesto: ${puestos.join(' o ')}.` });
  }
  next();
};

module.exports = { verifyToken, soloTrabajador, soloCliente, verifyPuesto };
