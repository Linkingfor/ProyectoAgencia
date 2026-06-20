const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

// ════════════════════════════════════════════════════
//  INTRANET — Trabajadores
// ════════════════════════════════════════════════════

// POST /api/auth/login  → login de trabajador (intranet)
const loginTrabajador = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }
  try {
    const { rows } = await pool.query(`
      SELECT u.id_usuario, u.username, u.password, u.estado,
             t.id_trabajador, t.nombres, t.puesto, t.correo
      FROM usuario_trabajador u
      JOIN trabajador t ON t.id_trabajador = u.id_trabajador
      WHERE u.username = $1
    `, [username]);

    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas.' });
    const u = rows[0];
    if (u.estado && u.estado !== 'activo') {
      return res.status(403).json({ error: 'Usuario inactivo. Contacta al administrador.' });
    }

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    await pool.query('UPDATE usuario_trabajador SET ultimo_acceso = NOW() WHERE id_usuario = $1', [u.id_usuario]);

    const usuario = {
      id: u.id_usuario,
      id_trabajador: u.id_trabajador,
      nombre: u.nombres,
      username: u.username,
      puesto: u.puesto,
      correo: u.correo,
      tipo: 'trabajador',
    };
    res.json({ token: signToken(usuario), usuario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/register  → registrar trabajador + su usuario (intranet, solo admin)
const registerTrabajador = async (req, res) => {
  const { dni, nombres, puesto, telefono, correo, username, password } = req.body;
  if (!dni || !nombres || !puesto || !username || !password) {
    return res.status(400).json({ error: 'DNI, nombre, puesto, usuario y contraseña son requeridos.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query(
      'SELECT 1 FROM trabajador WHERE dni = $1 UNION SELECT 1 FROM usuario_trabajador WHERE username = $2',
      [dni, username]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El DNI o nombre de usuario ya está registrado.' });
    }

    const trab = await client.query(
      'INSERT INTO trabajador (dni, nombres, puesto, telefono, correo) VALUES ($1,$2,$3,$4,$5) RETURNING id_trabajador',
      [dni, nombres, puesto, telefono || null, correo || null]
    );
    const id_trabajador = trab.rows[0].id_trabajador;

    const hash = await bcrypt.hash(password, 10);
    await client.query(
      'INSERT INTO usuario_trabajador (username, password, estado, id_trabajador) VALUES ($1,$2,$3,$4)',
      [username, hash, 'activo', id_trabajador]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Trabajador y usuario creados correctamente.', id_trabajador });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════════════
//  PÁGINA COMERCIAL — Clientes
// ════════════════════════════════════════════════════

// GET /api/auth/me  → datos del usuario logueado (del token)
const me = async (req, res) => {
  res.json({ usuario: req.user });
};

module.exports = {
  loginTrabajador, registerTrabajador,
  me,
};
