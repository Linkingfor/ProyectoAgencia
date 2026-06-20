const { pool } = require('../config/database');

// GET /api/salidas  (con transporte, horario, servicio, ocupación y personal asignado)
const getAll = async (req, res) => {
  try {
    const { fecha } = req.query;
    let sql = `
      SELECT s.id_salida, s.fecha, s.disponibilidad_stock,
             s.id_transporte, s.id_horario, s.id_servicio,
             t.placa, t.tipo_vehiculo, t.marca, t.capacidad AS capacidad_transporte,
             h.hora_inicio, h.hora_fin,
             srv.id_servicio  AS id_servicio_tour,
             srv.nombre       AS tour_nombre,
             COALESCE(r.pax, 0)        AS pax_reservados,
             COALESCE(r.nreservas, 0)  AS total_reservas,
             COALESCE(a.personal, '')  AS personal_asignado
      FROM salidas s
      LEFT JOIN transporte       t   ON t.id_transporte = s.id_transporte
      LEFT JOIN horario_servicio h   ON h.id_horario     = s.id_horario
      LEFT JOIN servicio         srv ON srv.id_servicio  = s.id_servicio
      LEFT JOIN (
        SELECT id_salida, SUM(cantidad_personas) AS pax, COUNT(*) AS nreservas
        FROM reserva WHERE estado <> 'cancelada' GROUP BY id_salida
      ) r ON r.id_salida = s.id_salida
      LEFT JOIN (
        SELECT a.id_salida, STRING_AGG(t2.nombres || ' (' || a.funcion || ')', ', ') AS personal
        FROM asignacion a JOIN trabajador t2 ON t2.id_trabajador = a.id_trabajador
        GROUP BY a.id_salida
      ) a ON a.id_salida = s.id_salida
    `;
    const params = [];
    if (fecha) { sql += ' WHERE s.fecha = $1'; params.push(fecha); }
    sql += ' ORDER BY s.fecha DESC, h.hora_inicio ASC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/salidas/:id
const getById = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, t.placa, t.tipo_vehiculo, t.capacidad AS capacidad_transporte,
             h.hora_inicio, h.hora_fin, srv.nombre AS servicio_nombre
      FROM salidas s
      LEFT JOIN transporte t         ON t.id_transporte = s.id_transporte
      LEFT JOIN horario_servicio h   ON h.id_horario     = s.id_horario
      LEFT JOIN servicio srv         ON srv.id_servicio  = s.id_servicio
      WHERE s.id_salida = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Salida no encontrada.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/salidas
const create = async (req, res) => {
  const { fecha, id_servicio, id_horario, id_transporte, disponibilidad_stock } = req.body;
  if (!fecha || !id_transporte || !id_servicio || !id_horario) {
    return res.status(400).json({ error: 'Fecha, servicio, horario y vehículo son requeridos.' });
  }
  try {
    // El horario debe pertenecer al servicio elegido
    const hor = await pool.query('SELECT id_horario FROM horario_servicio WHERE id_horario = $1 AND id_servicio = $2', [id_horario, id_servicio]);
    if (hor.rows.length === 0) return res.status(400).json({ error: 'El horario seleccionado no pertenece a ese servicio.' });

    // Tomar la capacidad del vehículo como stock disponible si no se indica
    const t = await pool.query('SELECT capacidad, estado FROM transporte WHERE id_transporte = $1', [id_transporte]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado.' });
    if (t.rows[0].estado !== 'disponible') {
      return res.status(400).json({ error: `El vehículo no está disponible (estado: ${t.rows[0].estado}).` });
    }

    // El vehículo no puede repetir el mismo horario el mismo día
    const dup = await pool.query(
      'SELECT 1 FROM salidas WHERE id_transporte = $1 AND fecha = $2::date AND id_horario = $3',
      [id_transporte, fecha, id_horario]
    );
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: `El vehículo ya tiene una salida en ese horario el ${fecha}.` });
    }

    const stock = disponibilidad_stock != null && disponibilidad_stock !== ''
      ? disponibilidad_stock : t.rows[0].capacidad;

    const { rows } = await pool.query(
      'INSERT INTO salidas (fecha, id_servicio, id_horario, disponibilidad_stock, id_transporte) VALUES ($1,$2,$3,$4,$5) RETURNING id_salida',
      [fecha, id_servicio, id_horario, stock, id_transporte]
    );
    res.status(201).json({ mensaje: 'Salida programada.', id: rows[0].id_salida });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/salidas/:id  → al cambiar de vehículo valida que la ocupación actual entre
const update = async (req, res) => {
  const { fecha, id_servicio, id_horario, id_transporte, disponibilidad_stock } = req.body;
  try {
    if (id_horario && id_servicio) {
      const hor = await pool.query('SELECT id_horario FROM horario_servicio WHERE id_horario = $1 AND id_servicio = $2', [id_horario, id_servicio]);
      if (hor.rows.length === 0) return res.status(400).json({ error: 'El horario seleccionado no pertenece a ese servicio.' });
    }

    // Pasajeros ya reservados en esta salida
    const ocup = await pool.query(
      "SELECT COALESCE(SUM(cantidad_personas),0) AS pax FROM reserva WHERE id_salida = $1 AND estado <> 'cancelada'",
      [req.params.id]
    );
    const pax = Number(ocup.rows[0].pax);

    // Capacidad del vehículo elegido
    const t = await pool.query('SELECT capacidad FROM transporte WHERE id_transporte = $1', [id_transporte]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado.' });
    const cap = Number(t.rows[0].capacidad);

    // El vehículo no puede repetir el mismo horario el mismo día
    const dup = await pool.query(
      'SELECT 1 FROM salidas WHERE id_transporte = $1 AND fecha = $2::date AND id_horario = $3 AND id_salida <> $4',
      [id_transporte, fecha, id_horario, req.params.id]
    );
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: `El vehículo ya tiene otra salida en ese horario el ${fecha}.` });
    }

    // ALERTA: el nuevo vehículo no puede con los pasajeros ya reservados
    if (pax > cap) {
      return res.status(400).json({
        error: `CAMBIO DE VEHÍCULO INVÁLIDO — La salida ya tiene ${pax} pasajeros reservados y el vehículo seleccionado solo admite ${cap}. Elige un vehículo de mayor capacidad.`
      });
    }

    await pool.query(
      'UPDATE salidas SET fecha=$1, id_servicio=$2, id_horario=$3, disponibilidad_stock=$4, id_transporte=$5 WHERE id_salida=$6',
      [fecha, id_servicio, id_horario, disponibilidad_stock, id_transporte, req.params.id]
    );
    res.json({ mensaje: 'Salida actualizada.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/salidas/:id
const remove = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM asignacion WHERE id_salida = $1', [req.params.id]);
    await client.query('UPDATE reserva SET id_salida = NULL WHERE id_salida = $1', [req.params.id]);
    await client.query('DELETE FROM salidas WHERE id_salida = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ mensaje: 'Salida eliminada.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
};

module.exports = { getAll, getById, create, update, remove };
