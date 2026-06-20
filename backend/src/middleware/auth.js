const jwt = require('jsonwebtoken');

// Verifica que exista un token válido
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

// Exige que el usuario sea de tipo trabajador (intranet)
const soloTrabajador = (req, res, next) => {
  if (req.user?.tipo !== 'trabajador') {
    return res.status(403).json({ error: 'Acceso restringido al personal de la agencia.' });
  }
  next();
};

// Exige que el usuario sea de tipo cliente (página comercial)
const soloCliente = (req, res, next) => {
  if (req.user?.tipo !== 'cliente') {
    return res.status(403).json({ error: 'Acceso restringido a clientes.' });
  }
  next();
};

// Exige uno de los puestos indicados (solo aplica a trabajadores)
const verifyPuesto = (...puestos) => (req, res, next) => {
  if (req.user?.tipo !== 'trabajador' || !puestos.includes(req.user.puesto)) {
    return res.status(403).json({ error: `Acceso denegado. Se requiere puesto: ${puestos.join(' o ')}.` });
  }
  next();
};

module.exports = { verifyToken, soloTrabajador, soloCliente, verifyPuesto };
