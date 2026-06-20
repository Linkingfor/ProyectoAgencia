import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  User, IdCard, Mail, Phone, Compass, Calendar, Sparkles, ArrowRight,
  Download, Receipt, CheckCircle2, Clock, XCircle, MapPin
} from 'lucide-react';

const estadoR = {
  pendiente:  { cls: 'badge-yellow', label: 'Pendiente',  Icon: Clock },
  confirmada: { cls: 'badge-green',  label: 'Confirmada', Icon: CheckCircle2 },
  cancelada:  { cls: 'badge-red',    label: 'Cancelada',  Icon: XCircle },
};

async function descargarPdf(id_venta, numero) {
  try {
    const { data } = await api.get(`/ventas/${id_venta}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `comprobante-${numero || id_venta}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
    toast.success('Comprobante descargado.');
  } catch { toast.error('No se pudo descargar el comprobante.'); }
}

export default function MiCuenta() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState('datos');
  const [reservas, setReservas] = useState([]);
  const [compras, setCompras]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/mi-cuenta/reservas').catch(() => ({ data: [] })),
      api.get('/mi-cuenta/compras').catch(() => ({ data: [] })),
    ]).then(([r, c]) => { setReservas(r.data); setCompras(c.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mc">
      <div className="mc-hero">
        <div className="mc-hero-inner">
          <div className="mc-avatar">{(usuario?.nombre || 'C')[0].toUpperCase()}</div>
          <div>
            <span className="mc-tag"><Sparkles size={13} /> Cuenta de cliente</span>
            <h1>Hola, {usuario?.nombre?.split(' ')[0]} 👋</h1>
            <p>Bienvenido a tu espacio personal en Agencia de Viajes Ica.</p>
          </div>
        </div>
      </div>

      <div className="mc-body">
        {/* Tabs */}
        <div className="mc-tabs">
          <button className={`mc-tab ${tab === 'datos' ? 'active' : ''}`} onClick={() => setTab('datos')}>
            <User size={15} /> Mis datos
          </button>
          <button className={`mc-tab ${tab === 'reservas' ? 'active' : ''}`} onClick={() => setTab('reservas')}>
            <Calendar size={15} /> Mis reservas
            {reservas.length > 0 && <span className="count">{reservas.length}</span>}
          </button>
          <button className={`mc-tab ${tab === 'compras' ? 'active' : ''}`} onClick={() => setTab('compras')}>
            <Receipt size={15} /> Mis compras
            {compras.length > 0 && <span className="count">{compras.length}</span>}
          </button>
        </div>

        {tab === 'datos' && (
          <div className="mc-grid">
            <div className="card">
              <div className="card-header"><p className="card-title">Mis datos personales</p></div>
              <div className="mc-datos">
                <Dato icon={<User size={17} />} label="Nombre completo" value={usuario?.nombre} />
                <Dato icon={<IdCard size={17} />} label="DNI" value={usuario?.dni} />
                <Dato icon={<Mail size={17} />} label="Correo" value={usuario?.correo} fallback="No registrado" />
                <Dato icon={<Phone size={17} />} label="Teléfono" value={usuario?.telefono} fallback="No registrado" />
                <Dato icon={<User size={17} />} label="Usuario" value={usuario?.username} />
              </div>
            </div>
            <div className="card mc-promo">
              <Compass size={26} />
              <h3>Explora nuestros tours</h3>
              <p>Revisa el catálogo y reserva tu próxima aventura.</p>
              <Link to="/catalogo" className="btn btn-primary" style={{ width: '100%' }}>
                Ver catálogo <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}

        {tab === 'reservas' && (
          <div className="card">
            <div className="card-header"><p className="card-title">Mis reservas</p></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Código</th><th>Destino</th><th>Fecha viaje</th><th>Pax</th><th>Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6}><div className="loading-screen" style={{ height: 'auto', padding: 30 }}><div className="spinner" /></div></td></tr>}
                  {!loading && reservas.map(r => {
                    const e = estadoR[r.estado] || { cls: 'badge-gray', label: r.estado, Icon: Clock };
                    const Ic = e.Icon;
                    return (
                      <tr key={r.id_reserva}>
                        <td><span style={{ color: '#2563eb', fontWeight: 700 }}>RES-{String(r.id_reserva).padStart(3, '0')}</span></td>
                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={13} color="#94a3b8" /> {r.servicio_nombre}</span></td>
                        <td className="muted">{r.fecha_servicio}</td>
                        <td><span className="badge badge-blue">{r.cantidad_personas} pax</span></td>
                        <td><strong>S/ {Number(r.total_estimado).toFixed(2)}</strong></td>
                        <td><span className={`badge ${e.cls}`}><Ic size={11} /> {e.label}</span></td>
                      </tr>
                    );
                  })}
                  {!loading && reservas.length === 0 && (
                    <tr><td colSpan={6}>
                      <div className="empty-state">
                        <div className="icon"><Calendar size={26} /></div>
                        <h3>Aún no tienes reservas</h3>
                        <p>Explora nuestros tours y reserva tu primera aventura.</p>
                        <Link to="/catalogo" className="btn btn-primary" style={{ marginTop: 14 }}>Ver catálogo <ArrowRight size={14} /></Link>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'compras' && (
          <div className="card">
            <div className="card-header"><p className="card-title">Mis compras y comprobantes</p></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Comprobante</th><th>Fecha</th><th>Método</th><th>Total</th><th>Estado</th><th>Descargar</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6}><div className="loading-screen" style={{ height: 'auto', padding: 30 }}><div className="spinner" /></div></td></tr>}
                  {!loading && compras.map(v => (
                    <tr key={v.id_venta}>
                      <td>
                        {v.comprobante_numero
                          ? <span className={`badge ${v.comprobante_tipo === 'factura' ? 'badge-green' : 'badge-purple'}`}><Receipt size={11} /> {v.comprobante_numero}</span>
                          : <span className="muted">—</span>}
                      </td>
                      <td className="muted">{v.fecha}</td>
                      <td><span className="badge badge-blue">{v.metodo_pago}</span></td>
                      <td><strong>S/ {Number(v.total).toFixed(2)}</strong></td>
                      <td><span className="badge badge-green"><CheckCircle2 size={11} /> {v.estado}</span></td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => descargarPdf(v.id_venta, v.comprobante_numero)}>
                          <Download size={13} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && compras.length === 0 && (
                    <tr><td colSpan={6}>
                      <div className="empty-state">
                        <div className="icon"><Receipt size={26} /></div>
                        <h3>Aún no tienes compras</h3>
                        <p>Tus comprobantes de pago aparecerán aquí.</p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .mc { animation: fadeIn 0.35s ease; }
        .mc-hero { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 44px 40px; }
        .mc-hero-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 20px; color: #fff; }
        .mc-avatar {
          width: 76px; height: 76px; border-radius: 20px;
          background: rgba(255,255,255,0.18); border: 2px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 800; flex-shrink: 0;
        }
        .mc-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #bfdbfe; }
        .mc-hero h1 { color: #fff; font-size: 26px; margin: 4px 0 2px; }
        .mc-hero p { color: #dbeafe; font-size: 14px; }

        .mc-body { max-width: 1100px; margin: 0 auto; padding: 28px 40px 40px; }

        .mc-tabs {
          display: flex; gap: 4px; background: #f1f5f9;
          padding: 4px; border-radius: var(--r-full); margin-bottom: 22px; width: fit-content;
        }
        .mc-tab {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: var(--r-full);
          background: transparent; border: none; cursor: pointer;
          font-size: 13px; font-weight: 600; color: var(--text-muted);
          transition: all var(--t-fast);
        }
        .mc-tab:hover { color: var(--text); }
        .mc-tab.active { background: #fff; color: var(--primary); box-shadow: var(--shadow-sm); }
        .mc-tab .count {
          background: var(--primary-soft); color: var(--primary);
          font-size: 10.5px; font-weight: 700; padding: 1px 7px; border-radius: var(--r-full);
        }
        .mc-tab.active .count { background: var(--primary); color: #fff; }

        .mc-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 22px; align-items: start; }
        .mc-datos { padding: 8px; }
        .mc-promo { padding: 26px; text-align: center; background: linear-gradient(135deg, #eff6ff, #fff); color: var(--primary); }
        .mc-promo h3 { font-size: 16px; margin: 12px 0 4px; color: var(--text-strong); }
        .mc-promo p { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }

        @media (max-width: 800px) {
          .mc-body { padding: 24px 20px; }
          .mc-hero { padding: 32px 20px; }
          .mc-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function Dato({ icon, label, value, fallback = '—' }) {
  return (
    <div className="mc-dato">
      <div className="mc-dato-ic">{icon}</div>
      <div><span>{label}</span><strong>{value || fallback}</strong></div>
      <style>{`
        .mc-dato { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: var(--r); transition: background var(--t-fast); }
        .mc-dato:hover { background: var(--bg-soft); }
        .mc-dato-ic { width: 40px; height: 40px; border-radius: 10px; background: var(--primary-50); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mc-dato span { font-size: 12px; color: var(--text-muted); display: block; }
        .mc-dato strong { font-size: 14px; color: var(--text-strong); }
      `}</style>
    </div>
  );
}
