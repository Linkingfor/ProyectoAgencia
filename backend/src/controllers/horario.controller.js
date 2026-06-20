const { pool } = require('../config/database');

// GET /api/horarios?id_servicio=  → horarios de un servicio (o todos si no se filtra)
const getAll = async (req, res) => {
  try {
    const { id_servicio } = req.query;
    let sql = `
      SELECT h.id_horario, h.id_servicio, h.hora_inicio, h.hora_fin, h.estado,
             s.nombre AS servicio_nombre
      FROM horario_servicio h
      JOIN servicio s ON s.id_servicio = h.id_servicio
    `;
    const params = [];
    if (id_servicio) { sql += ' WHERE h.id_servicio = $1'; params.push(id_servicio); }
    sql += ' ORDER BY h.hora_inicio ASC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/horarios  → crea un horario para un servicio
const create = async (req, res) => {
  const { id_servicio, hora_inicio, hora_fin, estado } = req.body;
  if (!id_servicio || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Servicio, hora de inicio y hora de fin son requeridos.' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado) VALUES ($1,$2,$3,$4) RETURNING id_horario',
      [id_servicio, hora_inicio, hora_fin, estado || 'Activo']
    );
    res.status(201).json({ mensaje: 'Horario creado.', id: rows[0].id_horario });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/horarios/:id
const update = async (req, res) => {
  const { hora_inicio, hora_fin, estado } = req.body;
  try {
    await pool.query(
      'UPDATE horario_servicio SET hora_inicio=$1, hora_fin=$2, estado=$3 WHERE id_horario=$4',
      [hora_inicio, hora_fin, estado, req.params.id]
    );
    res.json({ mensaje: 'Horario actualizado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/horarios/:id
const remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM horario_servicio WHERE id_horario = $1', [req.params.id]);
    res.json({ mensaje: 'Horario eliminado.' });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'No se puede eliminar: el horario tiene salidas asociadas.' });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, create, update, remove };
