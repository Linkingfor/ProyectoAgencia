const { pool } = require('../config/database');

// GET /api/reservas
const getAll = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id_reserva, r.fecha_reserva, r.fecha_servicio, r.cantidad_personas,
             r.estado, r.origen_reserva, r.observaciones, r.id_cliente, r.id_servicio, r.id_salida,
             c.nombres AS cliente_nombre, c.dni AS cliente_dni,
             s.nombre AS servicio_nombre, s.precio AS servicio_precio, s.capacidad AS servicio_capacidad
      FROM reserva r
      JOIN cliente  c ON c.id_cliente  = r.id_cliente
      JOIN servicio s ON s.id_servicio = r.id_servicio
      ORDER BY r.fecha_reserva DESC, r.id_reserva DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/reservas/:id
const getById = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, c.nombres AS cliente_nombre, s.nombre AS servicio_nombre
      FROM reserva r
      JOIN cliente c ON c.id_cliente = r.id_cliente
      JOIN servicio s ON s.id_servicio = r.id_servicio
      WHERE r.id_reserva = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/reservas/disponibilidad?id_servicio=&fecha_servicio=&cantidad_personas=&id_salida=&id_horario=
const checkDisponibilidad = async (req, res) => {
  const { id_servicio, fecha_servicio, cantidad_personas, id_salida, id_horario } = req.query;
  const cant = parseInt(cantidad_personas || 1);
  try {
    const srv = await pool.query('SELECT capacidad, nombre FROM servicio WHERE id_servicio = $1', [id_servicio]);
    if (srv.rows.length === 0) return res.status(404).json({ error: 'Servicio no encontrado.' });
    const capacidadServicio = Number(srv.rows[0].capacidad);

    // Tope máximo de pasajeros por salida (no por día — pueden existir varias
    // salidas del mismo tour el mismo día, cada una con su propio cupo)
    const excedeCapacidadServicio = cant > capacidadServicio;

    // RFC-002 + fix: si no se eligió una salida explícita, buscamos entre TODAS
    // las salidas existentes de ese servicio+horario+fecha la primera que
    // tenga cupo suficiente. Si ninguna tiene espacio, se creará una nueva.
    let idSalidaEfectiva = id_salida || null;
    let salida_se_creara = false;
    if (!idSalidaEfectiva && id_horario) {
      const cands = await pool.query(`
        SELECT s.id_salida, s.id_transporte, t.capacidad AS cap_vehiculo,
               COALESCE((SELECT SUM(cantidad_personas) FROM reserva
                         WHERE id_salida = s.id_salida AND estado <> 'cancelada'), 0) AS pax
        FROM salidas s LEFT JOIN transporte t ON t.id_transporte = s.id_transporte
        WHERE s.id_servicio = $1 AND s.id_horario = $2 AND s.fecha = $3::date
        ORDER BY s.id_salida ASC
      `, [id_servicio, id_horario, fecha_servicio]);

      for (const c of cands.rows) {
        const cap = c.id_transporte ? Number(c.cap_vehiculo || 0) : capacidadServicio;
        if (Number(c.pax) + cant <= cap) { idSalidaEfectiva = c.id_salida; break; }
      }
      if (!idSalidaEfectiva) salida_se_creara = true;
    }

    // Si hay salida (elegida, reutilizada o encontrada), validar fecha, tour y cupo
    let info_salida = null;
    let salida_otro_tour = null;
    let salida_fecha = null; // fecha de la salida si no coincide
    if (idSalidaEfectiva) {
      const sal = await pool.query(`
        SELECT s.id_salida, (s.fecha = $2::date) AS fecha_ok,
               TO_CHAR(s.fecha,'YYYY-MM-DD') AS fecha, s.id_transporte,
               t.capacidad AS cap_vehiculo, t.placa, t.tipo_vehiculo,
               COALESCE((SELECT SUM(cantidad_personas) FROM reserva
                         WHERE id_salida = s.id_salida AND estado <> 'cancelada'), 0) AS pax_salida
        FROM salidas s LEFT JOIN transporte t ON t.id_transporte = s.id_transporte
        WHERE s.id_salida = $1
      `, [idSalidaEfectiva, fecha_servicio]);
      if (sal.rows.length > 0) {
        const x = sal.rows[0];
        if (!x.fecha_ok) salida_fecha = x.fecha;
        // tope: capacidad del vehículo si ya tiene uno asignado, si no, el máximo del servicio
        const capTope = x.id_transporte ? Number(x.cap_vehiculo || 0) : capacidadServicio;
        info_salida = {
          capacidad_vehiculo: capTope,
          ocupados_vehiculo: Number(x.pax_salida),
          disponibles_vehiculo: capTope - Number(x.pax_salida),
          vehiculo: x.id_transporte ? `${x.tipo_vehiculo || ''} ${x.placa || ''}`.trim() : 'pendiente de asignar vehículo',
        };
      }
      const ot = await pool.query(
        `SELECT s.nombre FROM reserva r
         JOIN servicio s ON s.id_servicio = r.id_servicio
         WHERE r.id_salida = $1 AND r.estado <> 'cancelada' AND r.id_servicio <> $2 LIMIT 1`,
        [idSalidaEfectiva, id_servicio]
      );
      if (ot.rows.length > 0) salida_otro_tour = ot.rows[0].nombre;
    }

    // cupos a mostrar: si hay una salida resuelta, su disponibilidad real;
    // si se va a crear una nueva, parte con el cupo completo del servicio
    const disponiblesServicio = info_salida ? info_salida.disponibles_vehiculo : capacidadServicio;
    const cabeVehiculo = !info_salida || info_salida.disponibles_vehiculo >= cant;

    res.json({
      servicio: srv.rows[0].nombre,
      capacidad_servicio: capacidadServicio,
      disponibles_servicio: disponiblesServicio,
      excede_capacidad_servicio: excedeCapacidadServicio,
      info_salida,
      salida_otro_tour,
      salida_fecha_distinta: salida_fecha,
      salida_se_creara,
      puede_reservar: !excedeCapacidadServicio && cabeVehiculo && !salida_otro_tour && !salida_fecha,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/reservas  → crea reserva con validación de capacidad (RF-04)
// RFC-002: si no se indica id_salida, se busca o se crea automáticamente
// una salida usando id_servicio + id_horario + fecha_servicio.
const create = async (req, res) => {
  const { id_cliente, id_servicio, fecha_servicio, cantidad_personas, id_salida, id_horario, origen_reserva, observaciones } = req.body;
  const cant = parseInt(cantidad_personas);

  if (!id_cliente || !id_servicio || !fecha_servicio || !cant) {
    return res.status(400).json({ error: 'Cliente, servicio, fecha y cantidad de personas son requeridos.' });
  }
  if (cant < 1) return res.status(400).json({ error: 'La cantidad de personas debe ser al menos 1.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Validación: la reserva no puede exceder el tamaño máximo de
    //    una salida (capacidad del servicio). Esto NO es un tope diario:
    //    pueden existir varias salidas del mismo tour el mismo día. ──
    const srv = await client.query('SELECT capacidad, nombre FROM servicio WHERE id_servicio = $1 FOR UPDATE', [id_servicio]);
    if (srv.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Servicio no encontrado.' }); }
    const capServicio = Number(srv.rows[0].capacidad);

    if (cant > capServicio) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `LA RESERVA SUPERA LA CAPACIDAD DE UNA SALIDA — "${srv.rows[0].nombre}" admite máximo ${capServicio} pax por salida y estás reservando ${cant}.`
      });
    }

    // ── RFC-002 + fix: resolver la salida ──
    //    1) la elegida manualmente, o
    //    2) la primera salida existente de ese servicio+horario+fecha que
    //       tenga cupo suficiente (recorriendo TODAS, no solo la primera), o
    //    3) si ninguna tiene espacio, se crea una nueva automáticamente.
    let salidaId = id_salida || null;

    if (!salidaId && id_horario) {
      const horOk = await client.query(
        'SELECT 1 FROM horario_servicio WHERE id_horario = $1 AND id_servicio = $2',
        [id_horario, id_servicio]
      );
      if (horOk.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El horario seleccionado no pertenece a ese servicio.' });
      }

      const candidatos = await client.query(`
        SELECT s.id_salida, s.id_transporte, t.capacidad AS cap_vehiculo,
               COALESCE((SELECT SUM(cantidad_personas) FROM reserva
                         WHERE id_salida = s.id_salida AND estado <> 'cancelada'), 0) AS pax
        FROM salidas s LEFT JOIN transporte t ON t.id_transporte = s.id_transporte
        WHERE s.id_servicio = $1 AND s.id_horario = $2 AND s.fecha = $3::date
        ORDER BY s.id_salida ASC
        FOR UPDATE OF s
      `, [id_servicio, id_horario, fecha_servicio]);

      for (const c of candidatos.rows) {
        const cap = c.id_transporte ? Number(c.cap_vehiculo || 0) : capServicio;
        if (Number(c.pax) + cant <= cap) { salidaId = c.id_salida; break; }
      }

      if (!salidaId) {
        const nueva = await client.query(
          'INSERT INTO salidas (fecha, id_servicio, id_horario) VALUES ($1,$2,$3) RETURNING id_salida',
          [fecha_servicio, id_servicio, id_horario]
        );
        salidaId = nueva.rows[0].id_salida;
      }
    }

    // ── Validaciones de la salida (si quedó una asignada/creada) ──
    if (salidaId) {
      const sal = await client.query(`
        SELECT (s.fecha = $2::date) AS fecha_ok,
               TO_CHAR(s.fecha,'YYYY-MM-DD') AS fecha, s.id_transporte,
               t.capacidad AS cap, t.placa, t.tipo_vehiculo,
               COALESCE((SELECT SUM(cantidad_personas) FROM reserva
                         WHERE id_salida = $1 AND estado <> 'cancelada'), 0) AS pax
        FROM salidas s LEFT JOIN transporte t ON t.id_transporte = s.id_transporte
        WHERE s.id_salida = $1
      `, [salidaId, fecha_servicio]);
      if (sal.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Salida no encontrada.' }); }
      const S = sal.rows[0];

      // 3a: la fecha de la salida debe coincidir con la fecha del servicio
      if (!S.fecha_ok) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `FECHA NO COINCIDE — La salida es del ${S.fecha} y la reserva es para el ${fecha_servicio}. Elige una salida de la misma fecha.`
        });
      }

      // 3b: la salida atiende un solo tour
      const otroTour = await client.query(
        `SELECT srv.nombre FROM reserva r
         JOIN servicio srv ON srv.id_servicio = r.id_servicio
         WHERE r.id_salida = $1 AND r.estado <> 'cancelada' AND r.id_servicio <> $2 LIMIT 1`,
        [salidaId, id_servicio]
      );
      if (otroTour.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `SALIDA OCUPADA POR OTRO TOUR — Esta salida ya está asignada al tour "${otroTour.rows[0].nombre}".`
        });
      }

      // 3c: cupo de la salida — capacidad del vehículo si ya tiene uno asignado,
      //     o el máximo del servicio por salida si todavía no se le asignó vehículo
      const capTope = S.id_transporte ? Number(S.cap || 0) : capServicio;
      const paxActual = Number(S.pax);
      if (paxActual + cant > capTope) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: S.id_transporte
            ? `VEHÍCULO SIN CUPOS — El vehículo ${S.tipo_vehiculo} ${S.placa} admite ${capTope} pax (ocupados: ${paxActual}). Asigna un vehículo de mayor capacidad o elige otra salida.`
            : `SALIDA SIN CUPOS — Esta salida admite máximo ${capTope} pax (ocupados: ${paxActual}). Elige otra salida o deja la asignación automática.`
        });
      }
    }

    const ins = await client.query(
      `INSERT INTO reserva (fecha_reserva, fecha_servicio, cantidad_personas, estado, origen_reserva, observaciones, id_cliente, id_servicio, id_salida)
       VALUES (CURRENT_DATE, $1, $2, 'pendiente', $3, $4, $5, $6, $7) RETURNING id_reserva`,
      [fecha_servicio, cant, origen_reserva || 'intranet', observaciones || null, id_cliente, id_servicio, salidaId]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Reserva creada exitosamente.', id: ins.rows[0].id_reserva, id_salida: salidaId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
};

// PATCH /api/reservas/:id/estado
const updateEstado = async (req, res) => {
  const { estado } = req.body;
  const validos = ['pendiente', 'confirmada', 'cancelada'];
  if (!validos.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  try {
    await pool.query('UPDATE reserva SET estado = $1 WHERE id_reserva = $2', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/reservas/:id/salida  → asignar/cambiar la salida de una reserva
const asignarSalida = async (req, res) => {
  const { id_salida } = req.body;
  try {
    const r = await pool.query(`
      SELECT r.cantidad_personas, r.id_servicio, TO_CHAR(r.fecha_servicio,'YYYY-MM-DD') AS fecha_servicio,
             srv.capacidad AS cap_servicio
      FROM reserva r JOIN servicio srv ON srv.id_servicio = r.id_servicio
      WHERE r.id_reserva = $1
    `, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada.' });
    const cant = Number(r.rows[0].cantidad_personas);
    const idServicio = r.rows[0].id_servicio;
    const fechaServicio = r.rows[0].fecha_servicio;
    const capServicio = Number(r.rows[0].cap_servicio);

    if (id_salida) {
      const sal = await pool.query(`
        SELECT (s.fecha = $3::date) AS fecha_ok, TO_CHAR(s.fecha,'YYYY-MM-DD') AS fecha, s.id_transporte,
               t.capacidad AS cap, t.placa, t.tipo_vehiculo,
               COALESCE((SELECT SUM(cantidad_personas) FROM reserva
                         WHERE id_salida = $1 AND estado <> 'cancelada' AND id_reserva <> $2), 0) AS pax
        FROM salidas s LEFT JOIN transporte t ON t.id_transporte = s.id_transporte
        WHERE s.id_salida = $1
      `, [id_salida, req.params.id, fechaServicio]);
      if (sal.rows.length === 0) return res.status(404).json({ error: 'Salida no encontrada.' });
      const S = sal.rows[0];

      if (!S.fecha_ok) {
        return res.status(400).json({
          error: `FECHA NO COINCIDE — La salida es del ${S.fecha} y la reserva es para el ${fechaServicio}.`
        });
      }

      const ot = await pool.query(
        `SELECT s.nombre FROM reserva r
         JOIN servicio s ON s.id_servicio = r.id_servicio
         WHERE r.id_salida = $1 AND r.estado <> 'cancelada' AND r.id_servicio <> $2 AND r.id_reserva <> $3 LIMIT 1`,
        [id_salida, idServicio, req.params.id]
      );
      if (ot.rows.length > 0) {
        return res.status(400).json({
          error: `SALIDA OCUPADA POR OTRO TOUR — Esta salida ya atiende el tour "${ot.rows[0].nombre}".`
        });
      }

      const capTope = S.id_transporte ? Number(S.cap || 0) : capServicio;
      const paxActual = Number(S.pax);
      if (paxActual + cant > capTope) {
        return res.status(400).json({
          error: S.id_transporte
            ? `VEHÍCULO SIN CUPOS — El vehículo ${S.tipo_vehiculo} ${S.placa} admite ${capTope} pax (ocupados: ${paxActual}).`
            : `SALIDA SIN CUPOS — Esta salida admite máximo ${capTope} pax (ocupados: ${paxActual}).`
        });
      }
    }
    await pool.query('UPDATE reserva SET id_salida = $1 WHERE id_reserva = $2', [id_salida || null, req.params.id]);
    res.json({ mensaje: 'Salida asignada a la reserva.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/reservas/:id/observaciones
const updateObservaciones = async (req, res) => {
  const { observaciones } = req.body;
  try {
    await pool.query('UPDATE reserva SET observaciones = $1 WHERE id_reserva = $2', [observaciones || null, req.params.id]);
    res.json({ mensaje: 'Observaciones actualizadas.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/reservas/:id
const remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM reserva WHERE id_reserva = $1', [req.params.id]);
    res.json({ mensaje: 'Reserva eliminada.' });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'No se puede eliminar: la reserva tiene una venta asociada.' });
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, checkDisponibilidad, create, updateEstado, asignarSalida, updateObservaciones, remove };
