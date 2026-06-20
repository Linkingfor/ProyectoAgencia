/* ════════════════════════════════════════════════════
   Reportes — Dashboard de la intranet
   ════════════════════════════════════════════════════
   Un solo endpoint que devuelve TODO lo que el dashboard necesita
   en una sola llamada (evita 5 viajes al servidor):

     - ingresos del mes en curso
     - reservas del mes
     - total de clientes y paquetes activos
     - serie de ventas por mes (para el gráfico de área)
     - top 5 destinos más reservados (para el gráfico de barras)
     - últimas 5 reservas (para la tabla)
   ════════════════════════════════════════════════════ */

const { pool } = require('../config/database');

// GET /api/reportes/dashboard  → métricas y gráficos para la intranet
const getDashboard = async (req, res) => {
  try {
    const [ingresos, reservasMes, clientesTotal, paquetesActivos] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(total),0) AS total FROM venta WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)"),
      pool.query("SELECT COUNT(*) AS total FROM reserva WHERE EXTRACT(MONTH FROM fecha_reserva) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha_reserva) = EXTRACT(YEAR FROM CURRENT_DATE)"),
      pool.query('SELECT COUNT(*) AS total FROM cliente'),
      pool.query("SELECT COUNT(*) AS total FROM servicio WHERE estado = 'activo'"),
    ]);

    const ventasMensuales = (await pool.query(`
      SELECT EXTRACT(MONTH FROM fecha)::int AS mes, COALESCE(SUM(total),0) AS total
      FROM venta WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY EXTRACT(MONTH FROM fecha) ORDER BY mes
    `)).rows;

    const destinosTop = (await pool.query(`
      SELECT s.nombre, COUNT(r.id_reserva)::int AS total_reservas
      FROM reserva r JOIN servicio s ON s.id_servicio = r.id_servicio
      WHERE r.estado <> 'cancelada'
      GROUP BY s.id_servicio, s.nombre
      ORDER BY total_reservas DESC LIMIT 5
    `)).rows;

    const ultimasReservas = (await pool.query(`
      SELECT r.id_reserva, c.nombres AS cliente, s.nombre AS destino,
             TO_CHAR(r.fecha_servicio,'YYYY-MM-DD') AS fecha,
             r.estado, (r.cantidad_personas * s.precio) AS total
      FROM reserva r
      JOIN cliente c ON c.id_cliente = r.id_cliente
      JOIN servicio s ON s.id_servicio = r.id_servicio
      ORDER BY r.fecha_reserva DESC, r.id_reserva DESC LIMIT 5
    `)).rows;

    res.json({
      ingresos_mes:       Number(ingresos.rows[0].total),
      total_reservas_mes: Number(reservasMes.rows[0].total),
      total_clientes:     Number(clientesTotal.rows[0].total),
      paquetes_activos:   Number(paquetesActivos.rows[0].total),
      ventas_mensuales:   ventasMensuales.map(v => ({ mes: v.mes, total: Number(v.total) })),
      destinos_top:       destinosTop,
      ultimas_reservas:   ultimasReservas,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getDashboard };
