const { pool } = require('../config/database');

/* ════════════════════════════════════════════════════
   "Mi cuenta" del cliente (página comercial)
   ════════════════════════════════════════════════════ */

// GET /api/mi-cuenta/reservas  → reservas del cliente logueado
const misReservas = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id_reserva, r.fecha_reserva, r.fecha_servicio, r.cantidad_personas,
             r.estado, r.origen_reserva,
             s.nombre AS servicio_nombre, s.precio AS servicio_precio,
             (r.cantidad_personas * s.precio) AS total_estimado
      FROM reserva r JOIN servicio s ON s.id_servicio = r.id_servicio
      WHERE r.id_cliente = $1
      ORDER BY r.fecha_reserva DESC, r.id_reserva DESC
    `, [req.user.id_cliente]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/mi-cuenta/compras  → compras (ventas) del cliente logueado
const misCompras = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.id_venta, v.fecha, v.total, v.metodo_pago, v.estado,
             c.tipo AS comprobante_tipo, c.numero AS comprobante_numero,
             c.fecha_emision
      FROM venta v
      LEFT JOIN comprobante c ON c.id_venta = v.id_venta
      WHERE v.id_cliente = $1
      ORDER BY v.fecha DESC, v.id_venta DESC
    `, [req.user.id_cliente]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ════════════════════════════════════════════════════
   Compra online — pasarela de pagos
   (Yape, Plin y transferencia. El pago con tarjeta se
   integrará en el RFC-003 vía Stripe.)
   ════════════════════════════════════════════════════ */

// POST /api/mi-cuenta/comprar
//   { id_servicio, fecha_servicio, cantidad_personas, metodo_pago }
// Crea reserva confirmada + venta + comprobante. Devuelve id_venta y número.
const comprarOnline = async (req, res) => {
  const { id_servicio, fecha_servicio, cantidad_personas, metodo_pago } = req.body;
  const cant = parseInt(cantidad_personas);

  if (!id_servicio || !fecha_servicio || !cant) {
    return res.status(400).json({ error: 'Servicio, fecha y cantidad de personas son requeridos.' });
  }
  if (cant < 1) return res.status(400).json({ error: 'La cantidad de personas debe ser al menos 1.' });

  const metodosValidos = ['yape', 'plin', 'transferencia'];
  if (!metodosValidos.includes(metodo_pago)) {
    return res.status(400).json({ error: 'Método de pago no válido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Capacidad y disponibilidad del servicio ──
    const srv = await client.query('SELECT capacidad, nombre, precio FROM servicio WHERE id_servicio = $1 AND estado = $2 FOR UPDATE', [id_servicio, 'activo']);
    if (srv.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Servicio no disponible.' }); }
    const cap = Number(srv.rows[0].capacidad);
    const precio = Number(srv.rows[0].precio);
    const nombreServicio = srv.rows[0].nombre;

    if (cant > cap) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `La compra supera la capacidad del servicio (máx ${cap}).` });
    }

    const ocup = await client.query(
      `SELECT COALESCE(SUM(cantidad_personas),0) AS pax FROM reserva
       WHERE id_servicio = $1 AND fecha_servicio = $2 AND estado <> 'cancelada'`,
      [id_servicio, fecha_servicio]
    );
    const disponibles = cap - Number(ocup.rows[0].pax);
    if (cant > disponibles) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: disponibles <= 0
          ? `TOUR LLENO — No quedan cupos para "${nombreServicio}" el ${fecha_servicio}.`
          : `POCOS CUPOS — Solo quedan ${disponibles} lugares para esa fecha.`
      });
    }

    // ── Crear reserva (confirmada, origen web) ──
    const reserva = await client.query(
      `INSERT INTO reserva (fecha_reserva, fecha_servicio, cantidad_personas, estado, origen_reserva, id_cliente, id_servicio)
       VALUES (CURRENT_DATE, $1, $2, 'confirmada', 'web', $3, $4) RETURNING id_reserva`,
      [fecha_servicio, cant, req.user.id_cliente, id_servicio]
    );

    // ── Crear venta ──
    const total = precio * cant;
    const venta = await client.query(
      "INSERT INTO venta (fecha, total, metodo_pago, estado, id_cliente) VALUES (CURRENT_DATE,$1,$2,'pagado',$3) RETURNING id_venta",
      [total, metodo_pago, req.user.id_cliente]
    );
    const id_venta = venta.rows[0].id_venta;

    // ── Detalle ──
    await client.query(
      'INSERT INTO detalle_venta (id_venta, id_servicio, cantidad, precio_unitario, subtotal) VALUES ($1,$2,$3,$4,$5)',
      [id_venta, id_servicio, cant, precio, total]
    );

    // ── Comprobante (boleta para compras web) ──
    const count = await client.query("SELECT COUNT(*) AS n FROM comprobante WHERE tipo = 'boleta'");
    const numero = `B001-${String(Number(count.rows[0].n) + 1).padStart(6, '0')}`;
    await client.query(
      'INSERT INTO comprobante (tipo, numero, fecha_emision, monto_total, id_venta) VALUES ($1,$2,CURRENT_DATE,$3,$4)',
      ['boleta', numero, total, id_venta]
    );

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: '¡Compra realizada con éxito!',
      id_venta,
      id_reserva: reserva.rows[0].id_reserva,
      numero_comprobante: numero,
      total,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
};

module.exports = { misReservas, misCompras, comprarOnline };
