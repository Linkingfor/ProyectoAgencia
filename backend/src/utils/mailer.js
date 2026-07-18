/* ════════════════════════════════════════════════════
   mailer.js — Envío de correos (Gmail)
   ════════════════════════════════════════════════════
   Usa nodemailer con una cuenta Gmail. Las credenciales van en .env:
     EMAIL_USER          = tucorreo@gmail.com
     EMAIL_APP_PASSWORD  = contraseña de aplicación de 16 dígitos
     EMAIL_FROM_NAME     = nombre que aparece como remitente

   Si no están configuradas, correoConfigurado() devuelve false y el
   resto del sistema sigue funcionando (el envío simplemente se avisa
   como no disponible, sin romper nada).
   ════════════════════════════════════════════════════ */

const nodemailer = require('nodemailer');

let _transport = null;

// Crea (una sola vez) el transporte de Gmail, si hay credenciales
function getTransport() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return null;
  if (!_transport) {
    _transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return _transport;
}

// ¿El correo está configurado en el .env?
const correoConfigurado = () => !!getTransport();

// Plantilla HTML del correo del comprobante
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
  const transport = getTransport();
  if (!transport) {
    throw new Error('El correo no está configurado. Agrega EMAIL_USER y EMAIL_APP_PASSWORD en el archivo .env del backend.');
  }
  if (!to) throw new Error('El cliente no tiene un correo registrado.');

  const fromName = process.env.EMAIL_FROM_NAME || 'Agencia de Viajes Ica';
  await transport.sendMail({
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${tipo === 'factura' ? 'Factura' : 'Boleta'} ${numero} — Agencia de Viajes Ica`,
    html: plantillaComprobante({ nombre, tipo, numero, total }),
    attachments: [
      { filename: `${tipo}-${numero}.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
    ],
  });
}

module.exports = { enviarComprobante, correoConfigurado };
