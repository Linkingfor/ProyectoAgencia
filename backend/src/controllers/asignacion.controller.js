const { pool } = require('../config/database');

// GET /api/asignaciones?id_salida=
const getAll = async (req, res) => {
  try {
    const { id_salida } = req.query;
    let sql = `
      SELECT a.id_asignacion, a.id_salida, a.id_trabajador, a.funcion,
             t.nombres AS trabajador_nombre, t.puesto AS trabajador_puesto,
             s.fecha, h.hora_inicio AS hora_salida
      FROM asignacion a
      JOIN trabajador t ON t.id_trabajador = a.id_trabajador
      JOIN salidas s    ON s.id_salida    = a.id_salida
      LEFT JOIN horario_servicio h ON h.id_horario = s.id_horario
    `;
    const params = [];
    if (id_salida) { sql += ' WHERE a.id_salida = $1'; params.push(id_salida); }
    sql += ' ORDER BY s.fecha DESC, t.nombres';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/asignaciones  → asigna trabajador a una salida (valida cruce de horario)
const create = async (req, res) => {
  const { id_salida, id_trabajador, funcion } = req.body;
  if (!id_salida || !id_trabajador) {
    return res.status(400).json({ error: 'Salida y trabajador son requeridos.' });
  }
  try {
    // ¿Ya está asignado a esta misma salida?
    const dup = await pool.query(
      'SELECT 1 FROM asignacion WHERE id_salida = $1 AND id_trabajador = $2',
      [id_salida, id_trabajador]
    );
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: 'El trabajador ya está asignado a esta salida.' });
    }

    // Datos de la salida destino (horario a través de horario_servicio)
    const sal = await pool.query(
      `SELECT s.fecha, h.hora_inicio, h.hora_fin
       FROM salidas s LEFT JOIN horario_servicio h ON h.id_horario = s.id_horario
       WHERE s.id_salida = $1`,
      [id_salida]
    );
    if (sal.rows.length === 0) return res.status(404).json({ error: 'Salida no encontrada.' });
    const { fecha, hora_inicio, hora_fin } = sal.rows[0];

    // Cruce de horario: otra salida el mismo día con horario solapado
    const cruce = await pool.query(`
      SELECT s.id_salida FROM asignacion a
      JOIN salidas s ON s.id_salida = a.id_salida
      LEFT JOIN horario_servicio h ON h.id_horario = s.id_horario
      WHERE a.id_trabajador = $1 AND s.fecha = $2 AND s.id_salida <> $3
        AND COALESCE(h.hora_inicio, '00:00'::time) < COALESCE($5::time, '23:59'::time)
        AND COALESCE(h.hora_fin,   '23:59'::time) > COALESCE($4::time, '00:00'::time)
    `, [id_trabajador, fecha, id_salida, hora_inicio, hora_fin]);

    if (cruce.rows.length > 0) {
      return res.status(400).json({
        error: 'CRUCE DE HORARIO — El trabajador ya tiene una salida asignada en ese mismo horario.'
      });
    }

    const ins = await pool.query(
      'INSERT INTO asignacion (id_salida, id_trabajador, funcion) VALUES ($1,$2,$3) RETURNING id_asignacion',
      [id_salida, id_trabajador, funcion || 'apoyo']
    );
    res.status(201).json({ mensaje: 'Trabajador asignado a la salida.', id: ins.rows[0].id_asignacion });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/asignaciones/:id
const remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM asignacion WHERE id_asignacion = $1', [req.params.id]);
    res.json({ mensaje: 'Asignación eliminada.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getAll, create, remove };
