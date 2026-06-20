import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  DollarSign, CalendarCheck, Users, Package, TrendingUp,
  ArrowUpRight, ArrowRight, CheckCircle2, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const estadoBadge = (e) => {
  const m = { confirmada: 'badge-green', pendiente: 'badge-yellow', cancelada: 'badge-red' };
  return <span className={`badge ${m[e] || 'badge-gray'}`}><span className="badge-dot" /> {e}</span>;
};

const avatarColor = (s = '') => 'c' + ((s.charCodeAt(0) || 0) % 8);
const initials = (n = '') => n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reportes/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-screen" style={{ height: 'auto', padding: 80 }}>
          <div className="spinner" /><p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="page"><p>Error cargando datos.</p></div>;

  const ventasData = (data.ventas_mensuales || []).map(v => ({ mes: MESES[v.mes], total: Number(v.total) }));
  const totalAno = ventasData.reduce((s, v) => s + v.total, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            <Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> ¡Hola {usuario?.nombre?.split(' ')[0]}! · Resumen del mes
          </p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        <StatCard color="green"  icon={<DollarSign size={20} />}    label="Ingresos del mes"
          value={`S/ ${Number(data.ingresos_mes).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          hint={`${ventasData.length} mes${ventasData.length === 1 ? '' : 'es'} con ventas`} />
        <StatCard color="blue"   icon={<CalendarCheck size={20} />} label="Reservas del mes"
          value={data.total_reservas_mes} hint="actividad reciente" />
        <StatCard color="purple" icon={<Users size={20} />}         label="Clientes activos"
          value={data.total_clientes} hint="cartera total" />
        <StatCard color="orange" icon={<Package size={20} />}       label="Paquetes activos"
          value={data.paquetes_activos} hint="en catálogo" />
      </div>

      {/* ── Charts ── */}
      <div className="dashboard-charts">
        <div className="card chart-card">
          <div className="card-header">
            <div>
              <p className="card-title">Ingresos mensuales</p>
              <p className="card-subtitle">Evolución del año {new Date().getFullYear()}</p>
            </div>
            <div className="chart-total">
              <span className="muted">Total año</span>
              <strong>S/ {totalAno.toLocaleString('es-PE')}</strong>
            </div>
          </div>
          <div style={{ padding: '20px 14px 14px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ventasData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }}
                  formatter={(v) => [`S/ ${Number(v).toLocaleString('es-PE')}`, 'Ingresos']} />
                <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} fill="url(#gIng)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <div>
              <p className="card-title">Destinos populares</p>
              <p className="card-subtitle">Top 5 por reservas</p>
            </div>
          </div>
          <div style={{ padding: '20px 14px 14px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.destinos_top || []} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }}
                  cursor={{ fill: 'rgba(124,58,237,0.05)' }} />
                <Bar dataKey="total_reservas" fill="url(#gBar)" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Últimas reservas ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <p className="card-title">Últimas reservas</p>
            <p className="card-subtitle">Actividad reciente del sistema</p>
          </div>
          <Link to="/admin/reservas" className="btn btn-ghost btn-sm">Ver todas <ArrowUpRight size={14} /></Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Código</th><th>Cliente</th><th>Destino</th><th>Fecha viaje</th><th>Total</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {(data.ultimas_reservas || []).map(r => (
                <tr key={r.id_reserva}>
                  <td><span style={{ color: '#2563eb', fontWeight: 700 }}>RES-{String(r.id_reserva).padStart(3, '0')}</span></td>
                  <td>
                    <div className="user-cell">
                      <div className={`avatar avatar-sm ${avatarColor(r.cliente)}`}>{initials(r.cliente)}</div>
                      <span className="user-cell-name">{r.cliente}</span>
                    </div>
                  </td>
                  <td>{r.destino}</td>
                  <td className="muted">{r.fecha}</td>
                  <td><strong>S/ {Number(r.total).toFixed(2)}</strong></td>
                  <td>{estadoBadge(r.estado)}</td>
                </tr>
              ))}
              {(!data.ultimas_reservas || data.ultimas_reservas.length === 0) && (
                <tr><td colSpan={6}><div className="empty-state"><div className="icon"><CalendarCheck size={24} /></div><h3>Sin reservas aún</h3><p>Las reservas aparecerán aquí cuando se registren.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .dashboard-charts {
          display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; margin-bottom: 24px;
        }
        .chart-card { animation: fadeUp 0.5s ease both; }
        .chart-total { display: flex; flex-direction: column; align-items: flex-end; }
        .chart-total .muted { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .chart-total strong { font-size: 18px; color: #059669; }
        @media (max-width: 1100px) { .dashboard-charts { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function StatCard({ icon, color, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <div className="stat-trend up"><TrendingUp size={13} strokeWidth={2.6} /> <span className="delta">{hint}</span></div>
      </div>
      <div className={`stat-icon ${color}`}>{icon}</div>
    </div>
  );
}
