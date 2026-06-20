/* ════════════════════════════════════════════════════
   Salidas — Cada salida = vehículo + fecha + turno
   ════════════════════════════════════════════════════
   Una "salida" representa un viaje concreto: la Minivan V1A-123
   sale el 15 de junio en el turno de la mañana.

   Reglas que esto enforce:
     - Un vehículo no puede tener DOS salidas en el mismo turno
       (mañana 07:00-13:00 / tarde 12:00-18:00).
     - Si quieres cambiar el vehículo de una salida que ya tiene
       pax reservados, el vehículo nuevo debe poder con esos pax.

   El getAll trae además: cuántos pasajeros lleva, qué personal está
   asignado, y a qué tour pertenece (derivado de sus reservas).
   ════════════════════════════════════════════════════ */

const { pool } = require('../config/database');

// GET /api/salidas  (con transporte, ocupación de pasajeros y personal asignado)
const getAll = async (req, res) => {
  try {
    const { fecha } = req.query;
    let sql = `
      SELECT s.id_salida, s.fecha, s.hora_salida, s.hora_retorno, s.disponibilidad_stock,
             s.id_transporte,
             t.placa, t.tipo_vehiculo, t.marca, t.capacidad AS capacidad_transporte,
             COALESCE(r.pax, 0)        AS pax_reservados,
             COALESCE(r.nreservas, 0)  AS total_reservas,
             COALESCE(a.personal, '')  AS personal_asignado,
             tour.id_servicio          AS id_servicio_tour,
             tour.nombre               AS tour_nombre
      FROM salidas s
      LEFT JOIN transporte t ON t.id_transporte = s.id_transporte
      LEFT JOIN (
        SELECT id_salida, SUM(cantidad_personas) AS pax, COUNT(*) AS nreservas
        FROM reserva WHERE estado <> 'cancelada' GROUP BY id_salida
      ) r ON r.id_salida = s.id_salida
      LEFT JOIN (
        SELECT a.id_salida, STRING_AGG(t2.nombres || ' (' || a.funcion || ')', ', ') AS personal
        FROM asignacion a JOIN trabajador t2 ON t2.id_trabajador = a.id_trabajador
        GROUP BY a.id_salida
      ) a ON a.id_salida = s.id_salida
      LEFT JOIN LATERAL (
        SELECT rr.id_servicio, srv.nombre
        FROM reserva rr JOIN servicio srv ON srv.id_servicio = rr.id_servicio
        WHERE rr.id_salida = s.id_salida AND rr.estado <> 'cancelada'
        LIMIT 1
      ) tour ON true
    `;
    const params = [];
    if (fecha) { sql += ' WHERE s.fecha = $1'; params.push(fecha); }
    sql += ' ORDER BY s.fecha DESC, s.hora_salida ASC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/salidas/:id
const getById = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, t.placa, t.tipo_vehiculo, t.capacidad AS capacidad_transporte
      FROM salidas s LEFT JOIN transporte t ON t.id_transporte = s.id_transporte
      WHERE s.id_salida = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Salida no encontrada.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/salidas
const create = async (req, res) => {
  const { fecha, hora_salida, hora_retorno, id_transporte, disponibilidad_stock } = req.body;
  if (!fecha || !id_transporte) {
    return res.status(400).json({ error: 'Fecha y vehículo son requeridos.' });
  }
  try {
    // Tomar la capacidad del vehículo como stock disponible si no se indica
    const t = await pool.query('SELECT capacidad, estado FROM transporte WHERE id_transporte = $1', [id_transporte]);
    if (t.rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado.' });
    if (t.rows[0].estado !== 'disponible') {
      return res.status(400).json({ error: `El vehículo no está disponible (estado: ${t.rows[0].estado}).` });
    }

    // El vehículo no puede repetir el mismo turno el mismo día
    if (hora_salida) {
      const dup = await pool.query(
        'SELECT 1 FROM salidas WHERE id_transporte = $1 AND fecha = $2::date AND hora_salida = $3::time',
        [id_transporte, fecha, hora_salida]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: `El vehículo ya tiene una salida en ese turno el ${fecha}.` });
      }
    }

    const stock = disponibilidad_stock != null && disponibilidad_stock !== ''
      ? disponibilidad_stock : t.rows[0].capacidad;

    const { rows } = await pool.query(
      'INSERT INTO salidas (fecha, hora_salida, hora_retorno, disponibilidad_stock, id_transporte) VALUES ($1,$2,$3,$4,$5) RETURNING id_salida',
      [fecha, hora_salida || null, hora_retorno || null, stock, id_transporte]
    );
    res.status(201).json({ mensaje: 'Salida programada.', id: rows[0].id_salida });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/salidas/:id  → al cambiar de vehículo valida que la ocupación actual entre
const update = async (req, res) => {
  const { fecha, hora_salida, hora_retorno, id_transporte, disponibilidad_stock } = req.body;
  try {
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

    // El vehículo no puede repetir el mismo turno el mismo día
    if (hora_salida) {
      const dup = await pool.query(
        'SELECT 1 FROM salidas WHERE id_transporte = $1 AND fecha = $2::date AND hora_salida = $3::time AND id_salida <> $4',
        [id_transporte, fecha, hora_salida, req.params.id]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: `El vehículo ya tiene otra salida en ese turno el ${fecha}.` });
      }
    }

    // ALERTA: el nuevo vehículo no puede con los pasajeros ya reservados
    if (pax > cap) {
      return res.status(400).json({
        error: `CAMBIO DE VEHÍCULO INVÁLIDO — La salida ya tiene ${pax} pasajeros reservados y el vehículo seleccionado solo admite ${cap}. Elige un vehículo de mayor capacidad.`
      });
    }

    await pool.query(
      'UPDATE salidas SET fecha=$1, hora_salida=$2, hora_retorno=$3, disponibilidad_stock=$4, id_transporte=$5 WHERE id_salida=$6',
      [fecha, hora_salida || null, hora_retorno || null, disponibilidad_stock, id_transporte, req.params.id]
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
