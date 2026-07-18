import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '../services/stripe';
import {
  X, Calendar, Users, CreditCard, Smartphone, Building2,
  CheckCircle2, Lock, ArrowRight, Download, Sparkles, ShieldCheck
} from 'lucide-react';

const METODOS = [
  { id: 'tarjeta',       label: 'Tarjeta',       icon: CreditCard, stripe: true  },
  { id: 'yape',          label: 'Yape',          icon: Smartphone, stripe: false },
  { id: 'plin',          label: 'Plin',          icon: Smartphone, stripe: false },
  { id: 'transferencia', label: 'Transferencia', icon: Building2,  stripe: false },
];

const stripePromise = getStripe();

async function descargarPdf(id_venta, numero) {
  try {
    const { data } = await api.get(`/ventas/${id_venta}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `comprobante-${numero || id_venta}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  } catch {}
}

// tras la compra, intentamos enviar el comprobante al correo del cliente (silencioso)
async function autoEnviarCorreo(id_venta) {
  try { await api.post(`/ventas/${id_venta}/enviar-correo`, {}); } catch {}
}

export default function Compra({ paquete, onClose }) {
  const [paso, setPaso]     = useState(1);
  const [fecha, setFecha]   = useState('');
  const [cant, setCant]     = useState(2);
  const [metodo, setMetodo] = useState('tarjeta');
  const [disp, setDisp]     = useState(null);
  const [comprobante, setComprobante] = useState(null);

  const [clientSecret, setClientSecret] = useState(null);
  const [piId, setPiId] = useState(null);
  const [loadingPI, setLoadingPI] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const total = Number(paquete.precio) * cant;

  // solo mostramos info visual; el backend valida de verdad al crear el pago
  const verificarDisp = async () => {
    if (!fecha) return toast.error('Selecciona una fecha.');
    if (cant < 1) return toast.error('Mínimo 1 persona.');
    // El backend valida realmente al crear el PaymentIntent. Aquí solo info visual.
    setDisp({
      disponibles_servicio: paquete.capacidad,
      capacidad_servicio: paquete.capacidad,
      puede_reservar: cant <= paquete.capacidad,
    });
  };

  // creamos el PaymentIntent de Stripe al entrar al paso de pago con tarjeta
  useEffect(() => {
    if (paso === 2 && metodo === 'tarjeta' && !clientSecret && !loadingPI) {
      setLoadingPI(true);
      api.post('/mi-cuenta/payment-intent', {
        id_servicio: paquete.id_servicio, fecha_servicio: fecha, cantidad_personas: cant,
      })
        .then(({ data }) => { setClientSecret(data.client_secret); setPiId(data.payment_intent_id); })
        .catch(err => toast.error(err.response?.data?.error || 'No se pudo iniciar el pago.'))
        .finally(() => setLoadingPI(false));
    }
  }, [paso, metodo]);

  const onStripeSuccess = async () => {
    try {
      const { data } = await api.post('/mi-cuenta/comprar', {
        id_servicio: paquete.id_servicio, fecha_servicio: fecha, cantidad_personas: cant,
        metodo_pago: 'tarjeta', payment_intent_id: piId,
      });
      setComprobante(data);
      setPaso(3);
      setTimeout(() => descargarPdf(data.id_venta, data.numero_comprobante), 600);
      autoEnviarCorreo(data.id_venta);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar la compra.');
    }
  };

  // para Yape, Plin y transferencia vamos directo al backend sin pasar por Stripe
  const pagarAlternativo = async () => {
    try {
      const { data } = await api.post('/mi-cuenta/comprar', {
        id_servicio: paquete.id_servicio, fecha_servicio: fecha, cantidad_personas: cant,
        metodo_pago: metodo,
      });
      setComprobante(data);
      setPaso(3);
      setTimeout(() => descargarPdf(data.id_venta, data.numero_comprobante), 600);
      autoEnviarCorreo(data.id_venta);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo procesar el pago.');
    }
  };

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <button className="cp-close" onClick={onClose}><X size={20} /></button>

        <div className="cp-steps">
          <div className={`cp-step ${paso >= 1 ? 'on' : ''}`}>1. Reserva</div>
          <div className={`cp-step ${paso >= 2 ? 'on' : ''}`}>2. Pago</div>
          <div className={`cp-step ${paso >= 3 ? 'on' : ''}`}>3. Listo</div>
        </div>

        {paso === 1 && (
          <div className="cp-body">
            <div className="cp-pkg">
              <div className="cp-pkg-icon">📍</div>
              <div>
                <h2>{paquete.nombre}</h2>
                <p>{paquete.descripcion}</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Fecha del tour</label>
                <div className="input-wrap">
                  <Calendar size={16} className="input-icon" />
                  <input type="date" className="form-input"
                    min={new Date().toISOString().split('T')[0]}
                    value={fecha} onChange={e => { setFecha(e.target.value); setDisp(null); setClientSecret(null); }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Personas</label>
                <div className="input-wrap">
                  <Users size={16} className="input-icon" />
                  <input type="number" min={1} max={paquete.capacidad} className="form-input"
                    value={cant} onChange={e => { setCant(parseInt(e.target.value) || 1); setDisp(null); setClientSecret(null); }} />
                </div>
              </div>
            </div>

            <button className="btn btn-outline" onClick={verificarDisp} disabled={!fecha}>
              <CheckCircle2 size={15} /> Verificar disponibilidad
            </button>

            {disp && (
              <div className={`cp-disp ${disp.puede_reservar ? 'ok' : 'no'}`}>
                {disp.puede_reservar
                  ? <><CheckCircle2 size={18} /> ¡Disponible! Capacidad del tour: {disp.capacidad_servicio} pax.</>
                  : <><X size={18} /> La cantidad supera la capacidad del tour.</>}
              </div>
            )}

            <div className="cp-resumen">
              <div className="row"><span>Precio por persona</span><strong>S/ {Number(paquete.precio).toFixed(2)}</strong></div>
              <div className="row"><span>Personas</span><strong>{cant}</strong></div>
              <div className="row total"><span>TOTAL</span><strong>S/ {total.toFixed(2)}</strong></div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
              onClick={() => setPaso(2)} disabled={!disp?.puede_reservar}>
              Continuar al pago <ArrowRight size={16} />
            </button>
          </div>
        )}

        {paso === 2 && (
          <div className="cp-body">
            <h2 className="cp-title">Método de pago</h2>
            <p className="cp-sub">Total a pagar: <strong>S/ {total.toFixed(2)}</strong></p>

            <div className="cp-metodos">
              {METODOS.map(m => {
                const I = m.icon;
                return (
                  <button key={m.id} type="button"
                    className={`cp-metodo ${metodo === m.id ? 'on' : ''}`}
                    onClick={() => { setMetodo(m.id); setClientSecret(null); }}>
                    <I size={20} /> {m.label}
                  </button>
                );
              })}
            </div>

            {metodo === 'tarjeta' && (
              <>
                <div className="cp-stripe-banner">
                  <ShieldCheck size={16} /> Pago procesado por <strong>Stripe</strong> · cifrado SSL · tu tarjeta nunca pasa por nuestros servidores
                </div>
                {loadingPI && (
                  <div className="loading-screen" style={{ height: 'auto', padding: 32 }}>
                    <div className="spinner" /><p>Conectando con Stripe...</p>
                  </div>
                )}
                {clientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb', borderRadius: '10px', fontFamily: 'Inter, system-ui' } } }}>
                    <StripeCardForm total={total} onSuccess={onStripeSuccess} onCancel={() => setPaso(1)} />
                  </Elements>
                )}
              </>
            )}

            {metodo !== 'tarjeta' && (
              <>
                <div className="cp-wallet">
                  <Smartphone size={36} />
                  <h3>Pago con {METODOS.find(m => m.id === metodo).label}</h3>
                  <p>Demo: al confirmar se generará tu comprobante automáticamente.</p>
                </div>
                <div className="cp-actions">
                  <button className="btn btn-outline" onClick={() => setPaso(1)}>Volver</button>
                  <button className="btn btn-primary btn-lg" onClick={pagarAlternativo} style={{ flex: 1 }}>
                    <Lock size={15} /> Confirmar pago S/ {total.toFixed(2)}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {paso === 3 && comprobante && (
          <div className="cp-body cp-success">
            <div className="cp-ok-circle"><CheckCircle2 size={42} /></div>
            <h2><Sparkles size={20} /> ¡Pago exitoso!</h2>
            <p>Tu reserva quedó confirmada. Te enviamos el comprobante.</p>

            <div className="cp-ok-detalle">
              <div className="row"><span>Tour</span><strong>{paquete.nombre}</strong></div>
              <div className="row"><span>Fecha</span><strong>{fecha}</strong></div>
              <div className="row"><span>Personas</span><strong>{cant}</strong></div>
              <div className="row"><span>Comprobante</span><strong style={{ color: '#2563eb' }}>{comprobante.numero_comprobante}</strong></div>
              <div className="row total"><span>TOTAL PAGADO</span><strong>S/ {Number(comprobante.total).toFixed(2)}</strong></div>
            </div>

            <div className="cp-actions">
              <button className="btn btn-outline" style={{ flex: 1 }}
                onClick={() => descargarPdf(comprobante.id_venta, comprobante.numero_comprobante)}>
                <Download size={15} /> Descargar PDF
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => { onClose(); window.location.href = '/mi-cuenta'; }}>
                Ir a mi cuenta <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .cp-overlay {
          position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px; animation: fadeIn 0.2s ease; overflow-y: auto;
        }
        .cp-modal {
          background: #fff; border-radius: 20px; width: 100%; max-width: 540px;
          padding: 28px; box-shadow: var(--shadow-xl);
          max-height: 92vh; overflow-y: auto;
          animation: scaleIn 0.25s ease; position: relative;
        }
        .cp-close {
          position: absolute; top: 16px; right: 16px;
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--bg-soft); border: none; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all var(--t-fast);
        }
        .cp-close:hover { background: var(--danger-bg); color: var(--danger); }

        .cp-steps { display: flex; gap: 8px; margin-bottom: 22px; margin-right: 36px; }
        .cp-step {
          flex: 1; text-align: center; padding: 9px;
          background: var(--bg-soft); color: var(--text-subtle);
          border-radius: var(--r); font-size: 12px; font-weight: 600;
          transition: all var(--t);
        }
        .cp-step.on { background: var(--primary); color: #fff; box-shadow: var(--shadow-blue); }

        .cp-body { display: flex; flex-direction: column; gap: 16px; }
        .cp-title { font-size: 20px; margin-bottom: 4px; }
        .cp-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }

        .cp-pkg {
          display: flex; align-items: center; gap: 14px;
          padding: 14px; background: var(--bg-soft); border-radius: var(--r);
        }
        .cp-pkg-icon {
          width: 52px; height: 52px; border-radius: 12px; font-size: 26px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          display: flex; align-items: center; justify-content: center;
        }
        .cp-pkg h2 { font-size: 17px; margin-bottom: 3px; }
        .cp-pkg p { font-size: 12.5px; color: var(--text-muted); line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .cp-disp {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px; border-radius: var(--r); font-size: 13px; font-weight: 600;
        }
        .cp-disp.ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .cp-disp.no { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

        .cp-resumen {
          background: linear-gradient(135deg, #eff6ff, #f8fafc);
          border: 1px solid #dbeafe; border-radius: var(--r-md);
          padding: 16px; display: flex; flex-direction: column; gap: 7px;
          font-size: 13px;
        }
        .cp-resumen .row { display: flex; justify-content: space-between; }
        .cp-resumen .row span { color: var(--text-muted); }
        .cp-resumen .row.total {
          border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 4px;
          font-size: 15px;
        }
        .cp-resumen .row.total span { color: #0f172a; font-weight: 700; }
        .cp-resumen .row.total strong { color: var(--primary); font-size: 19px; }

        .cp-metodos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .cp-metodo {
          padding: 14px 8px; border-radius: var(--r); border: 1.5px solid var(--border);
          background: #fff; cursor: pointer; font-size: 12px; font-weight: 600;
          color: var(--text-muted); transition: all var(--t-fast);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .cp-metodo:hover { border-color: var(--primary-200); }
        .cp-metodo.on { border-color: var(--primary); background: var(--primary-50); color: var(--primary); }

        .cp-stripe-banner {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #635bff, #7a73ff); color: #fff;
          padding: 10px 14px; border-radius: var(--r); font-size: 12.5px;
        }
        .cp-stripe-banner strong { font-weight: 700; }

        .cp-wallet {
          padding: 36px 20px; text-align: center; background: var(--bg-soft);
          border-radius: var(--r); color: var(--text-muted);
        }
        .cp-wallet h3 { font-size: 16px; color: var(--text); margin: 10px 0 4px; }
        .cp-wallet p { font-size: 13px; }

        .cp-actions { display: flex; gap: 10px; margin-top: 6px; }

        .cp-success { text-align: center; align-items: center; }
        .cp-ok-circle {
          width: 90px; height: 90px; border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669); color: #fff;
          display: flex; align-items: center; justify-content: center;
          margin: 8px auto 4px;
          box-shadow: 0 14px 28px -10px rgba(16, 185, 129, 0.5);
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cp-success h2 { font-size: 22px; display: inline-flex; align-items: center; gap: 8px; color: #059669; }
        .cp-success > p { font-size: 13px; color: var(--text-muted); }
        .cp-ok-detalle {
          width: 100%; background: var(--bg-soft); border-radius: var(--r-md);
          padding: 16px; display: flex; flex-direction: column; gap: 7px;
          font-size: 13px; text-align: left;
        }
        .cp-ok-detalle .row { display: flex; justify-content: space-between; }
        .cp-ok-detalle .row span { color: var(--text-muted); }
        .cp-ok-detalle .row.total { border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 4px; }
        .cp-ok-detalle .row.total strong { color: #059669; font-size: 17px; }
      `}</style>
    </div>
  );
}

// formulario de tarjeta - va dentro del proveedor de Stripe
function StripeCardForm({ total, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      toast.error(error.message || 'El pago fue rechazado.');
      setLoading(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      await onSuccess();
    } else {
      toast.error('El pago no se pudo completar.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <PaymentElement options={{ layout: 'tabs' }} />
      <div className="cp-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>Volver</button>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !stripe} style={{ flex: 1 }}>
          {loading ? 'Procesando...' : <><Lock size={15} /> Pagar S/ {total.toFixed(2)}</>}
        </button>
      </div>
      <style>{`
        .stripe-form { display: flex; flex-direction: column; gap: 14px; }
        .stripe-form .StripeElement { padding: 0; }
      `}</style>
    </form>
  );
}
