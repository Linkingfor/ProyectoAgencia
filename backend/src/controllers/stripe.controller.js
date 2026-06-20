/* ════════════════════════════════════════════════════
   Stripe — Puerta de entrada al cobro real con tarjeta
   ════════════════════════════════════════════════════
   Cómo funciona en 3 pasos:

     1) El frontend pide al backend que "abra" un cobro:
          POST /api/mi-cuenta/payment-intent
        → El backend habla con Stripe y crea un PaymentIntent.
        → Devuelve el client_secret (sin datos sensibles).

     2) El frontend monta Stripe Elements con ese client_secret.
        El usuario escribe su tarjeta directo en los iframes de Stripe.
        Los datos de la tarjeta NUNCA pasan por nuestro backend.

     3) Cuando Stripe confirma el cobro, el frontend llama a
        /api/mi-cuenta/comprar con el payment_intent_id. El backend
        vuelve a preguntarle a Stripe "¿de verdad este pago salió bien?"
        y solo entonces crea la reserva + venta + comprobante.

   Esto se llama "server-side verification" y es lo que evita que
   alguien hackee el frontend y diga "pagué" sin haber pagado.
   ════════════════════════════════════════════════════ */

const Stripe = require('stripe');
const { pool } = require('../config/database');

// Cliente único de Stripe (singleton) con la clave secreta del .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
const CURRENCY = (process.env.STRIPE_CURRENCY || 'pen').toLowerCase();

/**
 * POST /api/mi-cuenta/payment-intent
 * Body: { id_servicio, fecha_servicio, cantidad_personas }
 * Crea el PaymentIntent y devuelve el client_secret para que el frontend
 * pueda confirmar el pago con Stripe Elements.
 */
const createPaymentIntent = async (req, res) => {
  const { id_servicio, fecha_servicio, cantidad_personas } = req.body;
  const cant = parseInt(cantidad_personas);

  if (!id_servicio || !fecha_servicio || !cant || cant < 1) {
    return res.status(400).json({ error: 'Servicio, fecha y cantidad de personas son requeridos.' });
  }

  try {
    // 1. Validar servicio y calcular el total REAL en el backend (nunca confiar en el cliente)
    const srv = await pool.query(
      "SELECT id_servicio, nombre, precio, capacidad FROM servicio WHERE id_servicio = $1 AND estado = 'activo'",
      [id_servicio]
    );
    if (srv.rows.length === 0) return res.status(404).json({ error: 'Servicio no disponible.' });

    const { nombre, precio, capacidad } = srv.rows[0];
    if (cant > capacidad) {
      return res.status(400).json({ error: `Excede la capacidad máxima del tour (${capacidad} pax).` });
    }

    // Verificar cupos para esa fecha
    const ocup = await pool.query(
      `SELECT COALESCE(SUM(cantidad_personas),0) AS pax FROM reserva
       WHERE id_servicio = $1 AND fecha_servicio = $2 AND estado <> 'cancelada'`,
      [id_servicio, fecha_servicio]
    );
    const disp = Number(capacidad) - Number(ocup.rows[0].pax);
    if (cant > disp) {
      return res.status(400).json({
        error: disp <= 0 ? 'TOUR LLENO para esa fecha.' : `Solo quedan ${disp} cupos.`
      });
    }

    const total = Number(precio) * cant;
    const amount = Math.round(total * 100); // céntimos

    // 2. Crear PaymentIntent en Stripe
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      description: `${nombre} × ${cant} pax`,
      automatic_payment_methods: { enabled: true },
      metadata: {
        id_servicio: String(id_servicio),
        id_cliente:  String(req.user.id_cliente),
        cantidad:    String(cant),
        fecha_servicio,
      },
    });

    res.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount,
      total,
      currency: CURRENCY,
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Verifica que un PaymentIntent esté pagado y devuelve sus datos.
 * Lo usa cliente.controller.comprarOnline.
 */
const retrievePaymentIntent = async (id) => {
  return stripe.paymentIntents.retrieve(id);
};

module.exports = { createPaymentIntent, retrievePaymentIntent, CURRENCY };
