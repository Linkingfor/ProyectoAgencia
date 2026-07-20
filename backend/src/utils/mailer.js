/* ════════════════════════════════════════════════════
   mailer.js — Envío de correos (Resend)
   ════════════════════════════════════════════════════
   Usa la API de Resend (HTTP, no SMTP) — evita el bloqueo de
   puertos SMTP en el plan gratuito de Render.
   Variables en .env / Render:
     RESEND_API_KEY   = re_xxxxxxxxxxxx
     EMAIL_FROM       = onboarding@resend.dev (o tu dominio verificado)
     EMAIL_FROM_NAME  = nombre que aparece como remitente
   ════════════════════════════════════════════════════ */

const { Resend } = require('resend');

let _resend = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const correoConfigurado = () => !!getClient();

function plantillaComprobante({ nombre, tipo, numero, total }) {
  const tituloDoc = tipo === 'factura' ? 'factura' : 'boleta';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:#2563eb;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:20px">Agencia de Viajes Ica</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:.9">Sistema de Gestión Turística — UTP 2026</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:26px 28px;border-radius:0 0 12px 12px">
      <p style="font-size:15px">Hola <strong>${nombre || 'cliente'}</strong>,</p>
      <p style="font-size:14px;line-height:1.6;color:#334155">
        Gracias por tu compra. Adjuntamos tu <strong>${tituloDoc}</strong> electrónica
        en formato PDF con el detalle de tu pago.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin:18px 0">
        <table style="width:100%;font-size:14px">
          <tr><td style="color:#64748b;padding:3px 0">Comprobante</td><td style="text-align:right;font-weight:700;color:#2563eb">${numero}</td></tr>
          <tr><td style="color:#64748b;padding:3px 0">Tipo</td><td style="text-align:right;text-transform:capitalize">${tituloDoc}</td></tr>
          <tr><td style="color:#64748b;padding:3px 0">Total pagado</td><td style="text-align:right;font-weight:700;color:#059669">S/ ${Number(total).toFixed(2)}</td></tr>
        </table>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.6">
        Conserva este comprobante. Si tienes dudas, responde a este correo o escríbenos a
        contacto@agenciaica.com.
      </p>
      <p style="font-size:13px;color:#334155;margin-top:22px">¡Buen viaje! 🌵<br/><strong>Agencia de Viajes Ica</strong></p>
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">
      Este es un correo automático generado por el sistema.
    </p>
  </div>`;
}

/**
 * Envía el comprobante (PDF adjunto) al correo del cliente.
 * @param {Object} p
 * @param {string} p.to          correo destino
 * @param {string} p.nombre      nombre del cliente
 * @param {string} p.tipo        'boleta' | 'factura'
 * @param {string} p.numero      número del comprobante
 * @param {number} p.total       total pagado
 * @param {Buffer} p.pdfBuffer   el PDF en memoria
 */
async function enviarComprobante({ to, nombre, tipo, numero, total, pdfBuffer }) {
  const resend = getClient();
  if (!resend) {
    throw new Error('El correo no está configurado. Agrega RESEND_API_KEY en las variables de entorno del backend.');
  }
  if (!to) throw new Error('El cliente no tiene un correo registrado.');

  const fromName = process.env.EMAIL_FROM_NAME || 'Agencia de Viajes Ica';
  const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject: `${tipo === 'factura' ? 'Factura' : 'Boleta'} ${numero} — Agencia de Viajes Ica`,
    html: plantillaComprobante({ nombre, tipo, numero, total }),
    attachments: [
      { filename: `${tipo}-${numero}.pdf`, content: pdfBuffer },
    ],
  });

  if (error) throw new Error(error.message || 'No se pudo enviar el correo con Resend.');
}

module.exports = { enviarComprobante, correoConfigurado };
