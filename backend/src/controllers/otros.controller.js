// ─── TRABAJADORES ──────────────────────────────────────────────────────────
const { pool } = require('../config/database');

const trabajadoresController = {
  getAll: async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM trabajador ORDER BY nombres ASC');
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  getById: async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM trabajador WHERE id_trabajador = ?', [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Trabajador no encontrado.' });
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  create: async (req, res) => {
    const { dni, nombres, puesto, telefono, correo } = req.body;
    if (!dni || !nombres || !puesto) return res.status(400).json({ error: 'DNI, nombre y puesto son requeridos.' });
    try {
      const [result] = await pool.query(
        'INSERT INTO trabajador (dni, nombres, puesto, telefono, correo) VALUES (?, ?, ?, ?, ?)',
        [dni, nombres, puesto, telefono || null, correo || null]
      );
      res.status(201).json({ mensaje: 'Trabajador registrado.', id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  update: async (req, res) => {
    const { dni, nombres, puesto, telefono, correo } = req.body;
    try {
      await pool.query(
        'UPDATE trabajador SET dni=?, nombres=?, puesto=?, telefono=?, correo=? WHERE id_trabajador=?',
        [dni, nombres, puesto, telefono, correo, req.params.id]
      );
      res.json({ mensaje: 'Trabajador actualizado.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  remove: async (req, res) => {
    try {
      await pool.query('DELETE FROM trabajador WHERE id_trabajador = ?', [req.params.id]);
      res.json({ mensaje: 'Trabajador eliminado.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
};

// ─── SALIDAS ───────────────────────────────────────────────────────────────
const salidasController = {
  getAll: async (req, res) => {
    try {
      const { fecha } = req.query;
      let query = `
        SELECT sal.*, s.nombre AS servicio_nombre,
               GROUP_CONCAT(DISTINCT t.nombres ORDER BY t.nombres SEPARATOR ', ') AS personal_asignado
        FROM salidas sal
        JOIN servicio s ON sal.id_servicio = s.id_servicio
        LEFT JOIN asignacion a ON a.id_salida = sal.id_salida
        LEFT JOIN trabajador t ON t.id_trabajador = a.id_trabajador
      `;
      const params = [];
      if (fecha) { query += ' WHERE sal.fecha = ?'; params.push(fecha); }
      query += ' GROUP BY sal.id_salida ORDER BY sal.hora_salida ASC';

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  create: async (req, res) => {
    const { id_servicio, fecha, hora_salida, hora_retorno, disponibilidad_stock } = req.body;
    try {
      const [result] = await pool.query(
        'INSERT INTO salidas (id_servicio, fecha, hora_salida, hora_retorno, disponibilidad_stock) VALUES (?, ?, ?, ?, ?)',
        [id_servicio, fecha, hora_salida, hora_retorno || null, disponibilidad_stock]
      );
      res.status(201).json({ mensaje: 'Salida creada.', id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  // RF-05: Asignar trabajador validando cruces de horario
  asignarTrabajador: async (req, res) => {
    const { id_salida, id_trabajador, funcion } = req.body;
    try {
      // Verificar cruce de horarios
      const [salida] = await pool.query('SELECT fecha, hora_salida, hora_retorno FROM salidas WHERE id_salida = ?', [id_salida]);
      const [cruces] = await pool.query(`
        SELECT a.id_asignacion FROM asignacion a
        JOIN salidas s ON a.id_salida = s.id_salida
        WHERE a.id_trabajador = ? AND s.fecha = ?
          AND s.hora_salida < ? AND (s.hora_retorno IS NULL OR s.hora_retorno > ?)
          AND a.id_salida != ?
      `, [id_trabajador, salida[0].fecha, salida[0].hora_retorno || '23:59', salida[0].hora_salida, id_salida]);

      if (cruces.length > 0) {
        return res.status(400).json({ error: 'CRUCE DE HORARIO — El trabajador ya tiene una salida asignada en ese horario.' });
      }

      await pool.query(
        'INSERT INTO asignacion (id_salida, id_trabajador, funcion) VALUES (?, ?, ?)',
        [id_salida, id_trabajador, funcion]
      );
      res.status(201).json({ mensaje: 'Trabajador asignado correctamente.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
};

// ─── REPORTES ──────────────────────────────────────────────────────────────
const reportesController = {
  // RF-08: Dashboard con métricas principales
  getDashboard: async (req, res) => {
    try {
      const [[ingresos]]      = await pool.query("SELECT COALESCE(SUM(total),0) AS total FROM venta WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())");
      const [[reservas]]      = await pool.query("SELECT COUNT(*) AS total FROM reserva WHERE MONTH(fecha_reserva) = MONTH(CURDATE())");
      const [[clientes]]      = await pool.query("SELECT COUNT(*) AS total FROM cliente");
      const [[paquetes]]      = await pool.query("SELECT COUNT(*) AS total FROM servicio WHERE estado = 'activo'");

      const [ventasMensuales] = await pool.query(`
        SELECT MONTH(fecha) AS mes, SUM(total) AS total
        FROM venta WHERE YEAR(fecha) = YEAR(CURDATE())
        GROUP BY MONTH(fecha) ORDER BY mes ASC
      `);

      const [destinosTop] = await pool.query(`
        SELECT s.nombre, COUNT(r.id_reserva) AS total_reservas
        FROM reserva r JOIN servicio s ON r.id_servicio = s.id_servicio
        GROUP BY s.id_servicio ORDER BY total_reservas DESC LIMIT 5
      `);

      const [ultimasReservas] = await pool.query(`
        SELECT r.id_reserva, c.nombres AS cliente, s.nombre AS destino,
               r.fecha_servicio AS fecha, r.estado,
               (r.cantidad_personas * s.precio) AS total
        FROM reserva r
        JOIN cliente c ON r.id_cliente = c.id_cliente
        JOIN servicio s ON r.id_servicio = s.id_servicio
        ORDER BY r.fecha_reserva DESC LIMIT 5
      `);

      res.json({
        ingresos_mes: ingresos.total,
        total_reservas_mes: reservas.total,
        total_clientes: clientes.total,
        paquetes_activos: paquetes.total,
        ventas_mensuales: ventasMensuales,
        destinos_top: destinosTop,
        ultimas_reservas: ultimasReservas
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  },

  getVentasPorPeriodo: async (req, res) => {
    const { desde, hasta } = req.query;
    try {
      const [rows] = await pool.query(`
        SELECT DATE(fecha) AS dia, SUM(total) AS total, COUNT(*) AS cantidad
        FROM venta WHERE fecha BETWEEN ? AND ?
        GROUP BY DATE(fecha) ORDER BY dia ASC
      `, [desde, hasta]);
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
};

module.exports = { trabajadoresController, salidasController, reportesController };
