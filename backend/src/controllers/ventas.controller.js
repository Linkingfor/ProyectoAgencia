const { pool } = require('../config/database');

// GET /api/ventas
const getAll = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT v.id_venta, v.fecha, v.total, v.metodo_pago, v.estado, v.id_cliente,
             c.nombres AS cliente_nombre, c.dni AS cliente_dni,
             comp.tipo AS comprobante_tipo, comp.numero AS comprobante_numero
      FROM venta v
      JOIN cliente c ON c.id_cliente = v.id_cliente
      LEFT JOIN comprobante comp ON comp.id_venta = v.id_venta
      ORDER BY v.fecha DESC, v.id_venta DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/ventas/:id
const getById = async (req, res) => {
  try {
    const venta = await pool.query(`
      SELECT v.*, c.nombres AS cliente_nombre, c.dni AS cliente_dni
      FROM venta v JOIN cliente c ON c.id_cliente = v.id_cliente
      WHERE v.id_venta = $1
    `, [req.params.id]);
    if (venta.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada.' });

    const detalles = await pool.query(`
      SELECT dv.*, s.nombre AS servicio_nombre
      FROM detalle_venta dv JOIN servicio s ON s.id_servicio = dv.id_servicio
      WHERE dv.id_venta = $1
    `, [req.params.id]);
    const comp = await pool.query('SELECT * FROM comprobante WHERE id_venta = $1', [req.params.id]);

    res.json({ ...venta.rows[0], detalles: detalles.rows, comprobante: comp.rows[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/ventas  → registra pago físico: venta + detalle + comprobante
const create = async (req, res) => {
  const { id_cliente, metodo_pago, tipo_comprobante, items, id_reserva } = req.body;
  if (!id_cliente || !metodo_pago || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cliente, método de pago y al menos un servicio son requeridos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const total = items.reduce((s, i) => s + Number(i.precio_unitario) * Number(i.cantidad), 0);

    const venta = await client.query(
      "INSERT INTO venta (fecha, total, metodo_pago, estado, id_cliente) VALUES (CURRENT_DATE,$1,$2,'pagado',$3) RETURNING id_venta",
      [total, metodo_pago, id_cliente]
    );
    const id_venta = venta.rows[0].id_venta;

    for (const it of items) {
      const subtotal = Number(it.precio_unitario) * Number(it.cantidad);
      await client.query(
        'INSERT INTO detalle_venta (id_venta, id_servicio, cantidad, precio_unitario, subtotal) VALUES ($1,$2,$3,$4,$5)',
        [id_venta, it.id_servicio, it.cantidad, it.precio_unitario, subtotal]
      );
    }

    // Comprobante con número correlativo
    const tipo = tipo_comprobante === 'factura' ? 'factura' : 'boleta';
    const prefijo = tipo === 'factura' ? 'F001' : 'B001';
    const count = await client.query('SELECT COUNT(*) AS n FROM comprobante WHERE tipo = $1', [tipo]);
    const numero = `${prefijo}-${String(Number(count.rows[0].n) + 1).padStart(6, '0')}`;
    await client.query(
      'INSERT INTO comprobante (tipo, numero, fecha_emision, monto_total, id_venta) VALUES ($1,$2,CURRENT_DATE,$3,$4)',
      [tipo, numero, total, id_venta]
    );

    // Si la venta corresponde a una reserva, se confirma
    if (id_reserva) {
      await client.query("UPDATE reserva SET estado = 'confirmada' WHERE id_reserva = $1", [id_reserva]);
    }

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Pago registrado.', id_venta, numero_comprobante: numero, total });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
};



module.exports = { getAll, getById, create };
