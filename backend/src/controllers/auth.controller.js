/* ════════════════════════════════════════════════════
   Autenticación — Trabajadores e Intranet + Clientes Web
   ════════════════════════════════════════════════════
   Aquí vive todo lo relacionado con "quién entra al sistema".
   Hay dos mundos separados:
     - INTRANET (trabajadores)  → usuario_trabajador
     - PÁGINA COMERCIAL (clientes) → usuario_cliente
   Cada uno tiene su propio login y su propio token JWT con `tipo`,
   y el middleware se encarga de no dejar que se mezclen.
   ════════════════════════════════════════════════════ */

const bcrypt = require('bcryptjs');        // para comparar contraseñas hasheadas (nunca guardamos texto plano)
const jwt    = require('jsonwebtoken');    // para emitir/firmar el token de sesión
const { pool } = require('../config/database');

// Genera un token JWT con los datos del usuario (caduca en 8h por defecto)
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

// ════════════════════════════════════════════════════
//  INTRANET — Pra los Trabajadores
// ════════════════════════════════════════════════════

/**
  POST /api/auth/login
  Inicio de sesión de trabajador (intranet).
  Recibe { username, password }.
  Pasos: buscar usuario activo → comparar bcrypt → emitir JWT con tipo='trabajador'.
  Al éxito actualiza el `ultimo_acceso` (útil para auditoría).
 */
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

/*
  POST /api/auth/register
  Crea un trabajador + su acceso a la intranet en una sola operación.
 Solo lo puede ejecutar un admin (validado en el router con verifyPuesto).
  Se hace en TRANSACCIÓN: si algo falla a mitad, se deshace todo (rollback).
 */
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

/*
 POST /api/auth/cliente/login
  Inicio de sesión del cliente desde la página comercial.
  Funciona igual que el del trabajador pero contra la tabla usuario_cliente,
  y el token sale con tipo='cliente' (no puede pisar la intranet).
 */
const loginCliente = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }
  try {
    const { rows } = await pool.query(`
      SELECT uc.id_usuario_cliente, uc.username, uc.password,
             c.id_cliente, c.nombres, c.dni, c.correo, c.telefono
      FROM usuario_cliente uc
      JOIN cliente c ON c.id_cliente = uc.id_cliente
      WHERE uc.username = $1
    `, [username]);

    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas.' });
    const u = rows[0];

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    const usuario = {
      id: u.id_usuario_cliente,
      id_cliente: u.id_cliente,
      nombre: u.nombres,
      username: u.username,
      dni: u.dni,
      correo: u.correo,
      telefono: u.telefono,
      tipo: 'cliente',
    };
    res.json({ token: signToken(usuario), usuario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/auth/cliente/register
 * Auto-registro de cliente (cualquiera puede llamar este endpoint).
 * Crea registro en `cliente` + acceso en `usuario_cliente` y le devuelve
 * el token inmediatamente para que quede logueado de una.
 */
const registerCliente = async (req, res) => {
  const { nombres, dni, telefono, correo, username, password } = req.body;
  if (!nombres || !dni || !username || !password) {
    return res.status(400).json({ error: 'Nombre, DNI, usuario y contraseña son requeridos.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dupDni = await client.query('SELECT 1 FROM cliente WHERE dni = $1', [dni]);
    if (dupDni.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ya existe un cliente con ese DNI.' });
    }
    const dupUser = await client.query('SELECT 1 FROM usuario_cliente WHERE username = $1', [username]);
    if (dupUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso.' });
    }

    const cli = await client.query(
      'INSERT INTO cliente (nombres, dni, telefono, correo) VALUES ($1,$2,$3,$4) RETURNING id_cliente',
      [nombres, dni, telefono || null, correo || null]
    );
    const id_cliente = cli.rows[0].id_cliente;

    const hash = await bcrypt.hash(password, 10);
    await client.query(
      'INSERT INTO usuario_cliente (username, password, id_cliente) VALUES ($1,$2,$3)',
      [username, hash, id_cliente]
    );

    await client.query('COMMIT');

    const usuario = {
      id_cliente, nombre: nombres, username, dni, correo: correo || null,
      telefono: telefono || null, tipo: 'cliente',
    };
    res.status(201).json({ mensaje: 'Cuenta creada correctamente.', token: signToken(usuario), usuario });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/auth/me  → datos del usuario logueado (del token)
const me = async (req, res) => {
  res.json({ usuario: req.user });
};

module.exports = {
  loginTrabajador, registerTrabajador,
  loginCliente, registerCliente,
  me,
};
