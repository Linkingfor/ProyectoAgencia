const { pool } = require('../config/database');

// GET /api/transporte
const getAll = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transporte ORDER BY tipo_vehiculo, placa');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/transporte/:id
const getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM transporte WHERE id_transporte = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Transporte no encontrado.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/transporte
const create = async (req, res) => {
  const { placa, tipo_vehiculo, capacidad, marca, estado } = req.body;
  if (!placa || !tipo_vehiculo || capacidad == null) {
    return res.status(400).json({ error: 'Placa, tipo de vehículo y capacidad son requeridos.' });
  }
  try {
    const dup = await pool.query('SELECT 1 FROM transporte WHERE placa = $1', [placa]);
    if (dup.rows.length > 0) return res.status(400).json({ error: 'Ya existe un vehículo con esa placa.' });

    const { rows } = await pool.query(
      'INSERT INTO transporte (placa, tipo_vehiculo, capacidad, marca, estado) VALUES ($1,$2,$3,$4,$5) RETURNING id_transporte',
      [placa, tipo_vehiculo, capacidad, marca || null, estado || 'disponible']
    );
    res.status(201).json({ mensaje: 'Vehículo registrado.', id: rows[0].id_transporte });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/transporte/:id
const update = async (req, res) => {
  const { placa, tipo_vehiculo, capacidad, marca, estado } = req.body;
  try {
    await pool.query(
      'UPDATE transporte SET placa=$1, tipo_vehiculo=$2, capacidad=$3, marca=$4, estado=$5 WHERE id_transporte=$6',
      [placa, tipo_vehiculo, capacidad, marca || null, estado, req.params.id]
    );
    res.json({ mensaje: 'Vehículo actualizado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/transporte/:id
const remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM transporte WHERE id_transporte = $1', [req.params.id]);
    res.json({ mensaje: 'Vehículo eliminado.' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'No se puede eliminar: el vehículo está asignado a una o más salidas.' });
    }
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove };
