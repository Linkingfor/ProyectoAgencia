const { pool } = require('../config/database');

// GET /api/clientes  (intranet)
const getAll = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT c.id_cliente, c.nombres, c.dni, c.telefono, c.correo,
             uc.username, uc.fecha_registro
      FROM cliente c
      LEFT JOIN usuario_cliente uc ON uc.id_cliente = c.id_cliente
    `;
    const params = [];
    if (search) {
      sql += ` WHERE c.nombres ILIKE $1 OR c.dni ILIKE $1 OR c.correo ILIKE $1`;
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY c.nombres ASC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/clientes/:id
const getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/clientes
const create = async (req, res) => {
  const { nombres, dni, telefono, correo } = req.body;
  if (!nombres || !dni) {
    return res.status(400).json({ error: 'Nombre y DNI son requeridos.' });
  }
  try {
    const dup = await pool.query('SELECT 1 FROM cliente WHERE dni = $1', [dni]);
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un cliente con ese DNI.' });
    }
    const { rows } = await pool.query(
      'INSERT INTO cliente (nombres, dni, telefono, correo) VALUES ($1,$2,$3,$4) RETURNING id_cliente',
      [nombres, dni, telefono || null, correo || null]
    );
    res.status(201).json({ mensaje: 'Cliente registrado.', id: rows[0].id_cliente });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/clientes/:id
const update = async (req, res) => {
  const { nombres, dni, telefono, correo } = req.body;
  try {
    await pool.query(
      'UPDATE cliente SET nombres=$1, dni=$2, telefono=$3, correo=$4 WHERE id_cliente=$5',
      [nombres, dni, telefono || null, correo || null, req.params.id]
    );
    res.json({ mensaje: 'Cliente actualizado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/clientes/:id
const remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM cliente WHERE id_cliente = $1', [req.params.id]);
    res.json({ mensaje: 'Cliente eliminado.' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'No se puede eliminar: el cliente tiene reservas o ventas asociadas.' });
    }
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
