const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');

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

// GET /api/ventas/:id/pdf  → descarga el comprobante en PDF (RFC-004)
const downloadPdf = async (req, res) => {
  try {
    const ventaR = await pool.query(`
      SELECT v.*, c.nombres AS cliente_nombre, c.dni AS cliente_dni,
             c.correo AS cliente_correo, c.telefono AS cliente_telefono
      FROM venta v JOIN cliente c ON c.id_cliente = v.id_cliente
      WHERE v.id_venta = $1
    `, [req.params.id]);
    if (ventaR.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada.' });
    const venta = ventaR.rows[0];

    const detalles = (await pool.query(`
      SELECT dv.*, s.nombre AS servicio_nombre
      FROM detalle_venta dv JOIN servicio s ON s.id_servicio = dv.id_servicio
      WHERE dv.id_venta = $1
    `, [req.params.id])).rows;

    const compR = (await pool.query('SELECT * FROM comprobante WHERE id_venta = $1', [req.params.id])).rows;
    const comp = compR[0] || { tipo: 'boleta', numero: `TMP-${req.params.id}`, fecha_emision: venta.fecha };

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${comp.tipo}-${comp.numero}.pdf"`);
    doc.pipe(res);

    doc.fillColor('#2563eb').rect(50, 50, 495, 70).fill();
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('AGENCIA DE VIAJES ICA', 60, 65)
      .fontSize(10).font('Helvetica').text('Sistema de Gestión Turística — UTP 2026', 60, 95)
      .text('Ica, Perú · contacto@agenciaica.com', 60, 108);

    doc.rect(400, 50, 145, 70).fillAndStroke('#1e40af', '#1e40af');
    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold')
      .text(comp.tipo.toUpperCase(), 410, 62, { width: 130, align: 'center' })
      .fontSize(11).font('Helvetica').text(`N° ${comp.numero}`, 410, 82, { width: 130, align: 'center' })
      .fontSize(9).text(`Fecha: ${comp.fecha_emision}`, 410, 100, { width: 130, align: 'center' });

    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('DATOS DEL CLIENTE', 50, 145);
    doc.moveTo(50, 162).lineTo(545, 162).strokeColor('#cbd5e1').stroke();
    doc.fontSize(10).fillColor('#334155');
    let y = 172;
    const line = (l, v) => {
      doc.font('Helvetica-Bold').text(l, 50, y, { width: 100 });
      doc.font('Helvetica').text(v || '—', 155, y);
      y += 16;
    };
    line('Cliente:',  venta.cliente_nombre);
    line('DNI:',      venta.cliente_dni);
    line('Teléfono:', venta.cliente_telefono);
    line('Correo:',   venta.cliente_correo);

    y += 14;
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('DETALLE DE SERVICIOS', 50, y);
    y += 18;
    doc.rect(50, y, 495, 22).fill('#eff6ff');
    doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
      .text('SERVICIO', 60, y + 6, { width: 250 })
      .text('CANT.',    310, y + 6, { width: 50, align: 'right' })
      .text('P. UNIT.', 365, y + 6, { width: 75, align: 'right' })
      .text('SUBTOTAL', 445, y + 6, { width: 90, align: 'right' });
    y += 22;

    doc.fillColor('#000000').font('Helvetica').fontSize(10);
    detalles.forEach((d, i) => {
      if (i % 2 === 0) doc.rect(50, y, 495, 22).fill('#f8fafc');
      doc.fillColor('#0f172a')
        .text(d.servicio_nombre, 60, y + 6, { width: 250, ellipsis: true })
        .text(d.cantidad,        310, y + 6, { width: 50, align: 'right' })
        .text(`S/ ${Number(d.precio_unitario).toFixed(2)}`, 365, y + 6, { width: 75, align: 'right' })
        .text(`S/ ${Number(d.subtotal).toFixed(2)}`,        445, y + 6, { width: 90, align: 'right' });
      y += 22;
    });

    y += 10;
    const total = Number(venta.total);
    const subt  = total / 1.18;
    const igv   = total - subt;
    const totRow = (label, val, opts = {}) => {
      doc.fillColor(opts.bold ? '#0f172a' : '#475569').fontSize(opts.bold ? 12 : 10)
        .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 365, y, { width: 90, align: 'right' })
        .text(`S/ ${val.toFixed(2)}`, 460, y, { width: 80, align: 'right' });
      y += opts.bold ? 18 : 14;
    };
    totRow('Subtotal:', subt);
    totRow('IGV (18%):', igv);
    doc.moveTo(365, y - 2).lineTo(545, y - 2).strokeColor('#2563eb').lineWidth(1.5).stroke();
    y += 6;
    totRow('TOTAL:', total, { bold: true });

    y += 10;
    doc.rect(50, y, 495, 30).fill('#ecfdf5');
    doc.fillColor('#065f46').fontSize(11).font('Helvetica-Bold')
      .text(`Método de pago: ${(venta.metodo_pago || '').toUpperCase()}`, 60, y + 9)
      .text(`Estado: ${(venta.estado || '').toUpperCase()}`, 350, y + 9);

    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text('Documento generado electrónicamente — Agencia de Viajes Ica', 50, 780, { width: 495, align: 'center' })
      .text(`Emitido el ${new Date().toLocaleString('es-PE')}`, 50, 792, { width: 495, align: 'center' });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};

module.exports = { getAll, getById, create, downloadPdf };
