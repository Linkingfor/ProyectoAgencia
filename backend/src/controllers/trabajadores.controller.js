const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// GET /api/trabajadores
const getAll = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT t.id_trabajador, t.dni, t.nombres, t.puesto, t.telefono, t.correo,
             u.username, u.estado, u.ultimo_acceso
      FROM trabajador t
      LEFT JOIN usuario_trabajador u ON u.id_trabajador = t.id_trabajador
    `;
    const params = [];
    if (search) {
      sql += ` WHERE t.nombres ILIKE $1 OR t.dni ILIKE $1 OR t.correo ILIKE $1`;
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY t.nombres ASC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/trabajadores/:id
const getById = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, u.username, u.estado, u.ultimo_acceso
      FROM trabajador t
      LEFT JOIN usuario_trabajador u ON u.id_trabajador = t.id_trabajador
      WHERE t.id_trabajador = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Trabajador no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/trabajadores  → crea trabajador + (opcional) usuario de intranet
const create = async (req, res) => {
  const { dni, nombres, puesto, telefono, correo, username, password } = req.body;
  if (!dni || !nombres || !puesto) {
    return res.status(400).json({ error: 'DNI, nombre y puesto son requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query('SELECT 1 FROM trabajador WHERE dni = $1', [dni]);
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ya existe un trabajador con ese DNI.' });
    }

    const trab = await client.query(
      'INSERT INTO trabajador (dni, nombres, puesto, telefono, correo) VALUES ($1,$2,$3,$4,$5) RETURNING id_trabajador',
      [dni, nombres, puesto, telefono || null, correo || null]
    );
    const id_trabajador = trab.rows[0].id_trabajador;

    // Si se envía usuario+contraseña, se crea el acceso a la intranet
    if (username && password) {
      if (password.length < 6) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      }
      const dupUser = await client.query('SELECT 1 FROM usuario_trabajador WHERE username = $1', [username]);
      if (dupUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso.' });
      }
      const hash = await bcrypt.hash(password, 10);
      await client.query(
        'INSERT INTO usuario_trabajador (username, password, estado, id_trabajador) VALUES ($1,$2,$3,$4)',
        [username, hash, 'activo', id_trabajador]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Trabajador registrado.', id: id_trabajador });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/trabajadores/:id
const update = async (req, res) => {
  const { dni, nombres, puesto, telefono, correo, estado } = req.body;
  try {
    await pool.query(
      'UPDATE trabajador SET dni=$1, nombres=$2, puesto=$3, telefono=$4, correo=$5 WHERE id_trabajador=$6',
      [dni, nombres, puesto, telefono || null, correo || null, req.params.id]
    );
    if (estado) {
      await pool.query('UPDATE usuario_trabajador SET estado=$1 WHERE id_trabajador=$2', [estado, req.params.id]);
    }
    res.json({ mensaje: 'Trabajador actualizado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/trabajadores/:id
const remove = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM usuario_trabajador WHERE id_trabajador = $1', [req.params.id]);
    await client.query('DELETE FROM trabajador WHERE id_trabajador = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Trabajador eliminado.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') {
      return res.status(400).json({ error: 'No se puede eliminar: el trabajador tiene asignaciones activas.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getAll, getById, create, update, remove };
