const { pool } = require('../config/database');

// GET /api/servicios
const getAll = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM servicio ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/servicios/:id
const getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM servicio WHERE id_servicio = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/servicios
const create = async (req, res) => {
  const { nombre, descripcion, precio, capacidad, estado } = req.body;
  if (!nombre || precio == null || capacidad == null) {
    return res.status(400).json({ error: 'Nombre, precio y capacidad son requeridos.' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO servicio (nombre, descripcion, precio, capacidad, estado) VALUES ($1,$2,$3,$4,$5) RETURNING id_servicio',
      [nombre, descripcion || null, precio, capacidad, estado || 'activo']
    );
    res.status(201).json({ mensaje: 'Servicio creado.', id: rows[0].id_servicio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/servicios/:id
const update = async (req, res) => {
  const { nombre, descripcion, precio, capacidad, estado } = req.body;
  try {
    await pool.query(
      'UPDATE servicio SET nombre=$1, descripcion=$2, precio=$3, capacidad=$4, estado=$5 WHERE id_servicio=$6',
      [nombre, descripcion || null, precio, capacidad, estado, req.params.id]
    );
    res.json({ mensaje: 'Servicio actualizado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/servicios/:id  (desactiva, no borra)
const remove = async (req, res) => {
  try {
    await pool.query("UPDATE servicio SET estado = 'inactivo' WHERE id_servicio = $1", [req.params.id]);
    res.json({ mensaje: 'Servicio desactivado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/public/catalogo  → catálogo público (página comercial, sin login)
const getCatalogo = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id_servicio, nombre, descripcion, precio, capacidad FROM servicio WHERE estado = 'activo' ORDER BY nombre ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove, getCatalogo };
