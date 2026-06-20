import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, Bus, CalendarCheck, CreditCard,
  Users, Clock, CheckCircle2, XCircle, AlertCircle, MapPin, ArrowRight,
  Truck, UserPlus, Banknote, Receipt, X, Download, StickyNote
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const avatarColor = (s = '') => 'c' + ((s.charCodeAt(0) || 0) % 8);
const initials = (n = '') => n.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
const money = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

// descarga el comprobante como PDF y lo abre en el navegador
export async function descargarComprobantePdf(id_venta, numero) {
  try {
    const { data } = await api.get(`/ventas/${id_venta}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante-${numero || id_venta}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
    toast.success('PDF descargado.');
  } catch {
    toast.error('No se pudo descargar el PDF.');
  }
}

// ---- Transporte - flota de vehículos ----
const EMPTY_T = { placa: '', tipo_vehiculo: 'Minivan', capacidad: '', marca: '', estado: 'disponible' };
const estadoT = {
  disponible:    'badge-green',
  mantenimiento: 'badge-yellow',
  inactivo:      'badge-gray',
};

export function Transporte() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(EMPTY_T);
  const [editId, setEditId] = useState(null);
  const [q, setQ] = useState('');

  const load = () => api.get('/transporte').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_T); setEditId(null); setModal(true); };
  const openEdit = (t) => {
    setForm({ placa: t.placa, tipo_vehiculo: t.tipo_vehiculo, capacidad: t.capacidad, marca: t.marca || '', estado: t.estado });
    setEditId(t.id_transporte); setModal(true);
  };

  const save = async () => {
    if (!form.placa || !form.tipo_vehiculo || form.capacidad === '') return toast.error('Placa, tipo y capacidad son requeridos.');
    try {
      if (editId) { await api.put(`/transporte/${editId}`, form); toast.success('Vehículo actualizado.'); }
      else        { await api.post('/transporte', form); toast.success('Vehículo registrado.'); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar este vehículo?')) return;
    try { await api.delete(`/transporte/${id}`); toast.success('Vehículo eliminado.'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'No se pudo eliminar.'); }
  };

  const filtered = items.filter(t => !q || (t.placa + ' ' + t.tipo_vehiculo + ' ' + (t.marca || '')).toLowerCase().includes(q.toLowerCase()));
  const disp = items.filter(t => t.estado === 'disponible').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Flota de Transporte</h1>
          <p className="page-subtitle">Vehículos disponibles para las salidas</p>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <Search size={16} color="#94a3b8" />
            <input placeholder="Buscar vehículo..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nuevo Vehículo</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Total vehículos</p><p className="stat-value">{items.length}</p></div>
          <div className="stat-icon blue"><Truck size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Disponibles</p><p className="stat-value">{disp}</p></div>
          <div className="stat-icon green"><CheckCircle2 size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Capacidad total</p><p className="stat-value">{items.reduce((s, t) => s + Number(t.capacidad || 0), 0)} pax</p></div>
          <div className="stat-icon orange"><Users size={20} /></div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Placa</th><th>Tipo</th><th>Marca</th><th>Capacidad</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id_transporte}>
                  <td><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#2563eb' }}>{t.placa}</span></td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Bus size={15} color="#64748b" /> {t.tipo_vehiculo}</span></td>
                  <td className="muted">{t.marca || '—'}</td>
                  <td><span className="badge badge-blue">{t.capacidad} pax</span></td>
                  <td><span className={`badge ${estadoT[t.estado] || 'badge-gray'}`}><span className="badge-dot" /> {t.estado}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn-icon" onClick={() => openEdit(t)}><Pencil size={15} /></button>
                      <button className="btn-icon danger" onClick={() => del(t.id_transporte)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Truck size={26} /></div><h3>Sin vehículos</h3><p>Registra tu primer vehículo.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editId ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
            <p className="modal-desc">Datos del vehículo de la flota.</p>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Placa <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="form-input" value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value })} placeholder="V1A-123" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de vehículo <span style={{ color: '#ef4444' }}>*</span></label>
                  <select className="form-select" value={form.tipo_vehiculo} onChange={e => setForm({ ...form, tipo_vehiculo: e.target.value })}>
                    <option>Minivan</option><option>Bus</option><option>Buggy</option>
                    <option>Lancha</option><option>Camioneta</option><option>Auto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Capacidad (pax) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" className="form-input" value={form.capacidad} onChange={e => setForm({ ...form, capacidad: e.target.value })} placeholder="15" />
                </div>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input className="form-input" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Toyota Hiace" />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Estado</label>
                  <select className="form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                    <option value="disponible">Disponible</option>
                    <option value="mantenimiento">En mantenimiento</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Salidas - programación y personal asignado ----
// RFC-001: cada salida se programa eligiendo un servicio y uno de sus
// horarios (tabla horario_servicio), en vez de un turno fijo.
const fmtHora = (h) => h ? h.slice(0, 5) : '--:--';

export function Salidas() {
  const [salidas, setSalidas]   = useState([]);
  const [transportes, setTrans] = useState([]);
  const [trabajadores, setTrab] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]); // horarios del servicio elegido en el form
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ fecha: '', id_servicio: '', id_horario: '', id_transporte: '', disponibilidad_stock: '' });
  const [editId, setEditId]     = useState(null);
  const [asignModal, setAsignModal] = useState(null); // salida seleccionada
  const [asignaciones, setAsignaciones] = useState([]);
  const [asignForm, setAsignForm] = useState({ id_trabajador: '', funcion: 'guía' });

  const load = () => api.get('/salidas').then(r => setSalidas(r.data));
  useEffect(() => {
    load();
    api.get('/transporte').then(r => setTrans(r.data));
    api.get('/trabajadores').then(r => setTrab(r.data));
    api.get('/servicios').then(r => setServicios(r.data.filter(s => s.estado === 'activo')));
  }, []);

  const cargarHorarios = (id_servicio) => {
    if (!id_servicio) { setHorarios([]); return; }
    api.get(`/horarios?id_servicio=${id_servicio}`).then(r => setHorarios(r.data));
  };

  const openCreate = () => {
    setForm({ fecha: new Date().toISOString().split('T')[0], id_servicio: '', id_horario: '', id_transporte: '', disponibilidad_stock: '' });
    setHorarios([]);
    setEditId(null); setModal(true);
  };
  const openEdit = (s) => {
    setForm({ fecha: s.fecha, id_servicio: s.id_servicio || '', id_horario: s.id_horario || '',
      id_transporte: s.id_transporte || '', disponibilidad_stock: s.disponibilidad_stock || '' });
    cargarHorarios(s.id_servicio);
    setEditId(s.id_salida); setModal(true);
  };

  const save = async () => {
    if (!form.fecha || !form.id_transporte || !form.id_servicio || !form.id_horario) {
      return toast.error('Fecha, servicio, horario y vehículo son requeridos.');
    }
    const payload = {
      fecha: form.fecha,
      id_transporte: form.id_transporte,
      disponibilidad_stock: form.disponibilidad_stock,
      id_servicio: form.id_servicio,
      id_horario: form.id_horario,
    };
    try {
      if (editId) { await api.put(`/salidas/${editId}`, payload); toast.success('Salida actualizada.'); }
      else        { await api.post('/salidas', payload); toast.success('Salida programada.'); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar esta salida?')) return;
    try { await api.delete(`/salidas/${id}`); toast.success('Salida eliminada.'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  // funciones para manejar el personal de cada salida
  const openAsign = async (s) => {
    setAsignModal(s);
    setAsignForm({ id_trabajador: '', funcion: 'guía' });
    const { data } = await api.get(`/asignaciones?id_salida=${s.id_salida}`);
    setAsignaciones(data);
  };
  const addAsign = async () => {
    if (!asignForm.id_trabajador) return toast.error('Selecciona un trabajador.');
    try {
      await api.post('/asignaciones', { id_salida: asignModal.id_salida, ...asignForm });
      toast.success('Trabajador asignado.');
      const { data } = await api.get(`/asignaciones?id_salida=${asignModal.id_salida}`);
      setAsignaciones(data);
      setAsignForm({ id_trabajador: '', funcion: 'guía' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };
  const delAsign = async (id) => {
    try {
      await api.delete(`/asignaciones/${id}`);
      const { data } = await api.get(`/asignaciones?id_salida=${asignModal.id_salida}`);
      setAsignaciones(data);
      load();
    } catch { toast.error('Error.'); }
  };

  const hoy = new Date().toISOString().split('T')[0];
  const stats = {
    total: salidas.length,
    hoy: salidas.filter(s => s.fecha === hoy).length,
    proximas: salidas.filter(s => s.fecha > hoy).length,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Salidas</h1>
          <p className="page-subtitle">Programación de salidas, vehículos y personal asignado</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nueva Salida</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Total salidas</p><p className="stat-value">{stats.total}</p></div>
          <div className="stat-icon blue"><Bus size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Salidas hoy</p><p className="stat-value">{stats.hoy}</p></div>
          <div className="stat-icon green"><CalendarCheck size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Próximas</p><p className="stat-value">{stats.proximas}</p></div>
          <div className="stat-icon orange"><Clock size={20} /></div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Salida</th><th>Fecha y hora</th><th>Vehículo</th><th>Ocupación</th><th>Personal</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {salidas.map(s => {
                const cap = Number(s.capacidad_transporte || 0);
                const pax = Number(s.pax_reservados || 0);
                const pct = cap > 0 ? Math.min(100, (pax / cap) * 100) : 0;
                const color = pct >= 100 ? 'red' : pct >= 80 ? 'yellow' : 'green';
                return (
                  <tr key={s.id_salida}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, color: '#64748b' }}>SAL-{String(s.id_salida).padStart(3, '0')}</span>
                        {s.tour_nombre
                          ? <span className="badge badge-blue" style={{ width: 'fit-content' }}>{s.tour_nombre}</span>
                          : <span className="badge badge-gray" style={{ width: 'fit-content' }}>Libre</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{s.fecha}</span>
                        <span className="muted">{fmtHora(s.hora_inicio)} – {fmtHora(s.hora_fin)}</span>
                      </div>
                    </td>
                    <td>
                      {s.placa
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Bus size={14} color="#64748b" /> {s.tipo_vehiculo} <span className="muted">{s.placa}</span></span>
                        : <span className="muted">Sin vehículo</span>}
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span className="muted">{pax} pax</span>
                          <strong>{pax}/{cap}</strong>
                        </div>
                        <div className="progress"><div className={`progress-bar ${color}`} style={{ width: `${Math.max(3, pct)}%` }} /></div>
                      </div>
                    </td>
                    <td>
                      {s.personal_asignado
                        ? <span style={{ fontSize: 12 }}>{s.personal_asignado}</span>
                        : <span className="badge badge-gray">Sin asignar</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openAsign(s)}><UserPlus size={13} /> Personal</button>
                        <button className="btn-icon" onClick={() => openEdit(s)}><Pencil size={15} /></button>
                        <button className="btn-icon danger" onClick={() => del(s.id_salida)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {salidas.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Bus size={26} /></div><h3>Sin salidas programadas</h3><p>Programa tu primera salida.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear/editar salida */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editId ? 'Editar Salida' : 'Nueva Salida'}</h3>
            <p className="modal-desc">Programa la salida y asigna un vehículo de la flota.</p>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Servicio / Tour</label>
                <select className="form-select" value={form.id_servicio}
                  onChange={e => { setForm({ ...form, id_servicio: e.target.value, id_horario: '' }); cargarHorarios(e.target.value); }}>
                  <option value="">Seleccionar servicio...</option>
                  {servicios.map(s => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Horario</label>
                <select className="form-select" value={form.id_horario}
                  onChange={e => setForm({ ...form, id_horario: e.target.value })}
                  disabled={!form.id_servicio}>
                  <option value="">Seleccionar horario...</option>
                  {horarios.map(h => (
                    <option key={h.id_horario} value={h.id_horario}>{fmtHora(h.hora_inicio)} – {fmtHora(h.hora_fin)}</option>
                  ))}
                </select>
                {form.id_servicio && horarios.length === 0 && (
                  <p className="form-hint">Este servicio no tiene horarios configurados todavía.</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Vehículo</label>
                <select className="form-select" value={form.id_transporte} onChange={e => setForm({ ...form, id_transporte: e.target.value })}>
                  <option value="">Seleccionar vehículo...</option>
                  {transportes.filter(t => t.estado === 'disponible' || t.id_transporte === form.id_transporte).map(t => (
                    <option key={t.id_transporte} value={t.id_transporte}>{t.tipo_vehiculo} {t.placa} — {t.capacidad} pax</option>
                  ))}
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cupos (stock)</label>
                  <input type="number" className="form-input" value={form.disponibilidad_stock} onChange={e => setForm({ ...form, disponibilidad_stock: e.target.value })} placeholder="(capacidad del vehículo)" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar personal */}
      {asignModal && (
        <div className="modal-overlay" onClick={() => setAsignModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Personal de la salida SAL-{String(asignModal.id_salida).padStart(3, '0')}</h3>
            <p className="modal-desc">{asignModal.fecha} · {asignModal.tipo_vehiculo} {asignModal.placa}</p>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Trabajador</label>
                  <select className="form-select" value={asignForm.id_trabajador} onChange={e => setAsignForm({ ...asignForm, id_trabajador: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {trabajadores.map(t => <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombres} ({t.puesto})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ width: 130 }}>
                  <label className="form-label">Función</label>
                  <select className="form-select" value={asignForm.funcion} onChange={e => setAsignForm({ ...asignForm, funcion: e.target.value })}>
                    <option value="guía">Guía</option>
                    <option value="chofer">Chofer</option>
                    <option value="apoyo">Apoyo</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={addAsign}><Plus size={15} /></button>
              </div>

              <div className="asign-list">
                {asignaciones.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 16, fontSize: 13 }}>Sin personal asignado.</p>}
                {asignaciones.map(a => (
                  <div key={a.id_asignacion} className="asign-row">
                    <div className={`avatar avatar-sm ${avatarColor(a.trabajador_nombre)}`}>{initials(a.trabajador_nombre)}</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13 }}>{a.trabajador_nombre}</strong>
                      <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>{a.trabajador_puesto}</span>
                    </div>
                    <span className="badge badge-blue">{a.funcion}</span>
                    <button className="btn-icon danger" onClick={() => delAsign(a.id_asignacion)}><X size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAsignModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .asign-list { margin-top: 6px; display: flex; flex-direction: column; gap: 8px; }
        .asign-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: 1px solid var(--border-soft); border-radius: var(--r);
        }
        .turno-pick { display: flex; gap: 10px; }
        .turno-btn {
          flex: 1; padding: 12px 14px; border-radius: var(--r);
          border: 1.5px solid var(--border); background: #fff;
          font-size: 13px; font-weight: 600; color: var(--text-muted);
          cursor: pointer; transition: all var(--t-fast);
        }
        .turno-btn:hover { border-color: var(--primary-200); }
        .turno-btn.active {
          border-color: var(--primary); background: var(--primary-50); color: var(--primary);
        }
      `}</style>
    </div>
  );
}

// ---- Reservas ----
const estadoR = {
  pendiente:  { cls: 'badge-yellow', bar: '#f59e0b', label: 'Pendiente' },
  confirmada: { cls: 'badge-green',  bar: '#10b981', label: 'Confirmada' },
  cancelada:  { cls: 'badge-red',    bar: '#ef4444', label: 'Cancelada' },
};

export function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [salidas, setSalidas]   = useState([]);
  const [horarios, setHorarios] = useState([]); // RFC-002: horarios del servicio elegido
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ id_cliente: '', id_servicio: '', id_horario: '', fecha_servicio: '', cantidad_personas: 1, id_salida: '', observaciones: '' });
  const [disp, setDisp]         = useState(null);
  const [filtro, setFiltro]     = useState('todos');
  const [q, setQ]               = useState('');
  const [obsModal, setObsModal] = useState(null);   // RFC-005: reserva en edición de notas
  const [obsText, setObsText]   = useState('');
  const fmtHora = (h) => h ? h.slice(0, 5) : '--:--';

  const load = () => api.get('/reservas').then(r => setReservas(r.data));
  useEffect(() => {
    load();
    api.get('/clientes').then(r => setClientes(r.data));
    api.get('/servicios').then(r => setServicios(r.data.filter(s => s.estado === 'activo')));
    api.get('/salidas').then(r => setSalidas(r.data));
  }, []);

  const cargarHorarios = (id_servicio) => {
    if (!id_servicio) { setHorarios([]); return; }
    api.get(`/horarios?id_servicio=${id_servicio}`).then(r => setHorarios(r.data));
  };

  const openCreate = () => {
    setForm({ id_cliente: '', id_servicio: '', id_horario: '', fecha_servicio: '', cantidad_personas: 1, id_salida: '', observaciones: '' });
    setHorarios([]); setDisp(null); setModal(true);
  };

  // RFC-005: abrir/guardar las observaciones de una reserva existente
  const openObs = (r) => { setObsModal(r); setObsText(r.observaciones || ''); };
  const guardarObs = async () => {
    try {
      await api.patch(`/reservas/${obsModal.id_reserva}/observaciones`, { observaciones: obsText });
      toast.success('Observaciones guardadas.');
      setObsModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  const verificar = async () => {
    if (!form.id_servicio || !form.fecha_servicio || !form.id_horario) return toast.error('Elige servicio, horario y fecha.');
    try {
      const qs = `id_servicio=${form.id_servicio}&fecha_servicio=${form.fecha_servicio}&cantidad_personas=${form.cantidad_personas}&id_horario=${form.id_horario}${form.id_salida ? `&id_salida=${form.id_salida}` : ''}`;
      const { data } = await api.get(`/reservas/disponibilidad?${qs}`);
      setDisp(data);
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  const save = async () => {
    try {
      await api.post('/reservas', form);
      toast.success('Reserva creada exitosamente.');
      setModal(false); setDisp(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  const cambiarEstado = async (id, estado) => {
    try { await api.patch(`/reservas/${id}/estado`, { estado }); toast.success('Estado actualizado.'); load(); }
    catch { toast.error('Error.'); }
  };
  const del = async (id) => {
    if (!confirm('¿Eliminar esta reserva?')) return;
    try { await api.delete(`/reservas/${id}`); toast.success('Reserva eliminada.'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  const counts = useMemo(() => ({
    todos: reservas.length,
    pendiente: reservas.filter(r => r.estado === 'pendiente').length,
    confirmada: reservas.filter(r => r.estado === 'confirmada').length,
    cancelada: reservas.filter(r => r.estado === 'cancelada').length,
  }), [reservas]);

  const filtered = reservas.filter(r => {
    const okF = filtro === 'todos' || r.estado === filtro;
    const okQ = !q || (r.cliente_nombre + ' ' + (r.cliente_dni || '') + ' ' + r.servicio_nombre).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reservas</h1>
          <p className="page-subtitle">Gestión de reservas con control de cupos en tiempo real</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nueva Reserva</button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: '1 1 240px' }}>
            <Search size={16} color="#94a3b8" />
            <input placeholder="Buscar por cliente o servicio..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="tabs-pill">
            <button className={`tab-pill ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>Todas <span className="count">{counts.todos}</span></button>
            <button className={`tab-pill ${filtro === 'pendiente' ? 'active' : ''}`} onClick={() => setFiltro('pendiente')}>Pendientes <span className="count">{counts.pendiente}</span></button>
            <button className={`tab-pill ${filtro === 'confirmada' ? 'active' : ''}`} onClick={() => setFiltro('confirmada')}>Confirmadas <span className="count">{counts.confirmada}</span></button>
            <button className={`tab-pill ${filtro === 'cancelada' ? 'active' : ''}`} onClick={() => setFiltro('cancelada')}>Canceladas <span className="count">{counts.cancelada}</span></button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Cliente</th><th>Servicio</th><th>Fecha viaje</th><th>Pax</th><th>Origen</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(r => {
                const e = estadoR[r.estado] || { cls: 'badge-gray', bar: '#94a3b8', label: r.estado };
                return (
                  <tr key={r.id_reserva}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 4, height: 30, borderRadius: 2, background: e.bar }} />
                        <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 12.5 }}>RES-{String(r.id_reserva).padStart(3, '0')}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className={`avatar avatar-sm ${avatarColor(r.cliente_nombre)}`}>{initials(r.cliente_nombre)}</div>
                        <div className="user-cell-info">
                          <span className="user-cell-name">{r.cliente_nombre}</span>
                          <span className="user-cell-sub">{r.cliente_dni}</span>
                        </div>
                      </div>
                    </td>
                    <td>{r.servicio_nombre}</td>
                    <td className="muted">{r.fecha_servicio}</td>
                    <td><span className="badge badge-blue">{r.cantidad_personas} pax</span></td>
                    <td><span className="badge badge-gray">{r.origen_reserva || 'intranet'}</span></td>
                    <td>
                      <select className="form-select" style={{ fontSize: 12, padding: '6px 26px 6px 10px', width: 'auto' }}
                        value={r.estado} onChange={ev => cambiarEstado(r.id_reserva, ev.target.value)}>
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          className="btn-icon"
                          onClick={() => openObs(r)}
                          title={r.observaciones ? 'Ver/editar observaciones' : 'Agregar observaciones'}
                          style={r.observaciones ? { color: '#2563eb', background: 'var(--primary-50)' } : {}}
                        >
                          <StickyNote size={15} />
                        </button>
                        <button className="btn-icon danger" onClick={() => del(r.id_reserva)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><div className="icon"><CalendarCheck size={26} /></div><h3>Sin reservas</h3><p>No hay reservas con ese filtro.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Nueva Reserva</h3>
            <p className="modal-desc">Verifica la disponibilidad antes de confirmar.</p>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select className="form-select" value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombres} — {c.dni}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Servicio / Tour</label>
                <select className="form-select" value={form.id_servicio}
                  onChange={e => { setForm({ ...form, id_servicio: e.target.value, id_horario: '', id_salida: '' }); cargarHorarios(e.target.value); setDisp(null); }}>
                  <option value="">Seleccionar servicio...</option>
                  {servicios.map(s => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre} — {money(s.precio)} (cap. {s.capacidad})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Horario</label>
                <select className="form-select" value={form.id_horario}
                  onChange={e => { setForm({ ...form, id_horario: e.target.value, id_salida: '' }); setDisp(null); }}
                  disabled={!form.id_servicio}>
                  <option value="">Seleccionar horario...</option>
                  {horarios.map(h => (
                    <option key={h.id_horario} value={h.id_horario}>{fmtHora(h.hora_inicio)} – {fmtHora(h.hora_fin)}</option>
                  ))}
                </select>
                {form.id_servicio && horarios.length === 0 && (
                  <p className="form-hint">Este servicio no tiene horarios configurados. Agrégalos en el módulo Paquetes.</p>
                )}
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Fecha del servicio</label>
                  <input type="date" className="form-input" value={form.fecha_servicio} onChange={e => { setForm({ ...form, fecha_servicio: e.target.value, id_salida: '' }); setDisp(null); }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad de personas</label>
                  <input type="number" min={1} className="form-input" value={form.cantidad_personas} onChange={e => { setForm({ ...form, cantidad_personas: parseInt(e.target.value) || 1 }); setDisp(null); }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Salida (opcional)</label>
                <select className="form-select" value={form.id_salida}
                  onChange={e => { setForm({ ...form, id_salida: e.target.value }); setDisp(null); }}
                  disabled={!form.id_servicio || !form.fecha_servicio}>
                  <option value="">Automática (se crea o reutiliza según el horario)</option>
                  {salidas
                    .filter(s => s.fecha === form.fecha_servicio
                      && (!s.id_servicio_tour || String(s.id_servicio_tour) === String(form.id_servicio)))
                    .map(s => (
                      <option key={s.id_salida} value={s.id_salida}>
                        SAL-{String(s.id_salida).padStart(3, '0')} · {s.tipo_vehiculo ? `${s.tipo_vehiculo} ${s.placa}` : 'sin vehículo asignado'}
                        {s.tour_nombre ? ` · ${s.tour_nombre}` : ' · libre'}
                      </option>
                    ))}
                </select>
                <p className="form-hint">
                  {!form.id_servicio || !form.fecha_servicio || !form.id_horario
                    ? 'Elige servicio, horario y fecha. Si no escoges una salida puntual, el sistema buscará o creará una automáticamente para ese servicio, horario y fecha.'
                    : 'Déjalo en automático y el sistema reutiliza la salida de ese horario/fecha, o crea una nueva. El personal operativo le asignará el vehículo después en el módulo Salidas.'}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
                <textarea className="form-textarea" rows={2} value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Notas internas: alergias, requerimientos especiales, punto de recojo..." />
              </div>

              <button className="btn btn-outline" onClick={verificar} disabled={!form.id_servicio || !form.fecha_servicio || !form.id_horario}>
                <Search size={14} /> Verificar Disponibilidad
              </button>

              {disp && (() => {
                const lleno = disp.disponibles_servicio <= 0 || disp.excede_capacidad_servicio;
                const vehNo = disp.info_salida && disp.info_salida.disponibles_vehiculo < form.cantidad_personas;
                const ok = disp.puede_reservar;
                const cls = ok ? 'ok' : 'lleno';
                return (
                  <div className={`disp-alert ${cls}`}>
                    {ok ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                    <div style={{ flex: 1 }}>
                      <strong>
                        {disp.excede_capacidad_servicio ? '🚫 SUPERA LA CAPACIDAD DEL SERVICIO'
                          : disp.salida_fecha_distinta ? '🚫 FECHA DE SALIDA NO COINCIDE'
                          : disp.salida_otro_tour ? '🚫 SALIDA OCUPADA POR OTRO TOUR'
                          : lleno ? '🚫 TOUR LLENO'
                          : vehNo ? '🚫 VEHÍCULO SIN CUPOS'
                          : '✓ Disponible para reservar'}
                      </strong>
                      <p style={{ fontSize: 12, margin: '2px 0 0' }}>
                        {disp.salida_fecha_distinta
                          ? `La salida elegida es del ${disp.salida_fecha_distinta}, pero la reserva es para el ${form.fecha_servicio}.`
                          : disp.salida_otro_tour
                          ? `La salida seleccionada ya atiende el tour "${disp.salida_otro_tour}". Elige otra salida.`
                          : <>Servicio: {disp.disponibles_servicio} de {disp.capacidad_servicio} cupos libres.
                              {disp.info_salida && ` · Vehículo (${disp.info_salida.vehiculo}): ${disp.info_salida.disponibles_vehiculo} de ${disp.info_salida.capacidad_vehiculo} libres.`}
                              {ok && disp.salida_se_creara && ' · Se creará una nueva salida automáticamente para este horario.'}
                              {ok && !disp.salida_se_creara && !form.id_salida && ' · Se reutilizará la salida existente para ese horario y fecha.'}</>}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.id_cliente || !disp?.puede_reservar}>
                Confirmar Reserva <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RFC-005 — Modal de observaciones de una reserva */}
      {obsModal && (
        <div className="modal-overlay" onClick={() => setObsModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Observaciones · RES-{String(obsModal.id_reserva).padStart(3, '0')}</h3>
            <p className="modal-desc">{obsModal.cliente_nombre} · {obsModal.servicio_nombre} · {obsModal.fecha_servicio}</p>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Notas internas</label>
                <textarea className="form-textarea" rows={5} value={obsText}
                  onChange={e => setObsText(e.target.value)}
                  placeholder="Alergias, requerimientos especiales, punto de recojo, contacto adicional..." autoFocus />
                <p className="form-hint">Solo visible para el personal de la agencia.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setObsModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarObs}>Guardar notas</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .disp-alert {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 12px; font-size: 13px;
          animation: fadeUp 0.25s ease;
        }
        .disp-alert.ok    { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .disp-alert.lleno {
          background: linear-gradient(135deg, #fef2f2, #fee2e2); color: #991b1b;
          border: 1.5px solid #fca5a5; box-shadow: 0 0 0 4px rgba(239,68,68,0.08);
          animation: shake 0.4s ease, fadeUp 0.25s ease;
        }
        .disp-alert strong { display: block; font-size: 14px; font-weight: 700; }
        @keyframes shake {
          0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)}
          50%{transform:translateX(5px)} 75%{transform:translateX(-3px)}
        }
      `}</style>
    </div>
  );
}

// ---- Pagos físicos y comprobantes ----
export function Pagos() {
  const [ventas, setVentas]     = useState([]);
  const [reservas, setReservas] = useState([]);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ id_reserva: '', metodo_pago: 'efectivo', tipo_comprobante: 'boleta' });
  const [q, setQ]               = useState('');
  const [loading, setLoading]   = useState(false);

  const loadAll = () => {
    api.get('/ventas').then(r => setVentas(r.data));
    api.get('/reservas').then(r => setReservas(r.data));
  };
  useEffect(() => { loadAll(); }, []);

  // mostramos todas menos las canceladas
  const reservasPagables = reservas.filter(r => r.estado !== 'cancelada');

  const procesar = async () => {
    const r = reservas.find(x => String(x.id_reserva) === String(form.id_reserva));
    if (!r) return toast.error('Selecciona una reserva.');
    setLoading(true);
    try {
      const { data } = await api.post('/ventas', {
        id_cliente: r.id_cliente,
        metodo_pago: form.metodo_pago,
        tipo_comprobante: form.tipo_comprobante,
        id_reserva: r.id_reserva,
        items: [{ id_servicio: r.id_servicio, cantidad: r.cantidad_personas, precio_unitario: r.servicio_precio }],
      });
      toast.success(`Pago registrado. Comprobante ${data.numero_comprobante}`);
      setModal(false);
      setForm({ id_reserva: '', metodo_pago: 'efectivo', tipo_comprobante: 'boleta' });
      loadAll();
      setTimeout(() => descargarComprobantePdf(data.id_venta, data.numero_comprobante), 400);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar el pago.');
    } finally { setLoading(false); }
  };

  const filtered = ventas.filter(v => !q || (v.cliente_nombre || '').toLowerCase().includes(q.toLowerCase()));
  const totalCobrado = ventas.reduce((s, v) => s + Number(v.total || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registro de Pagos</h1>
          <p className="page-subtitle">Pagos por medios físicos y comprobantes emitidos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Banknote size={16} /> Registrar Pago</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Total cobrado</p><p className="stat-value">S/ {totalCobrado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p></div>
          <div className="stat-icon green"><Banknote size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Pagos registrados</p><p className="stat-value">{ventas.length}</p></div>
          <div className="stat-icon blue"><CreditCard size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Comprobantes</p><p className="stat-value">{ventas.filter(v => v.comprobante_numero).length}</p></div>
          <div className="stat-icon purple"><Receipt size={20} /></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ padding: 16 }}>
          <div className="search-bar">
            <Search size={16} color="#94a3b8" />
            <input placeholder="Buscar pago por cliente..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Método</th><th>Comprobante</th><th>Estado</th><th>PDF</th></tr></thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id_venta}>
                  <td><span style={{ color: '#2563eb', fontWeight: 700 }}>PAG-{String(v.id_venta).padStart(3, '0')}</span></td>
                  <td>
                    <div className="user-cell">
                      <div className={`avatar avatar-sm ${avatarColor(v.cliente_nombre)}`}>{initials(v.cliente_nombre)}</div>
                      <span className="user-cell-name">{v.cliente_nombre}</span>
                    </div>
                  </td>
                  <td className="muted">{v.fecha}</td>
                  <td><strong>{money(v.total)}</strong></td>
                  <td><span className="badge badge-blue">{v.metodo_pago}</span></td>
                  <td>{v.comprobante_numero
                    ? <span className={`badge ${v.comprobante_tipo === 'factura' ? 'badge-green' : 'badge-purple'}`}>{v.comprobante_numero}</span>
                    : <span className="muted">—</span>}</td>
                  <td><span className="badge badge-green"><span className="badge-dot" /> {v.estado}</span></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => descargarComprobantePdf(v.id_venta, v.comprobante_numero)}>
                      <Download size={13} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><div className="icon"><CreditCard size={26} /></div><h3>Sin pagos registrados</h3><p>Registra el pago de una reserva.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Registrar Pago</h3>
            <p className="modal-desc">Pago por medio físico. Selecciona la reserva a cobrar.</p>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Reserva</label>
                <select className="form-select" value={form.id_reserva} onChange={e => setForm({ ...form, id_reserva: e.target.value })}>
                  <option value="">Seleccionar reserva...</option>
                  {reservasPagables.map(r => (
                    <option key={r.id_reserva} value={r.id_reserva}>
                      RES-{String(r.id_reserva).padStart(3, '0')} · {r.cliente_nombre} · {r.servicio_nombre} · {money(r.cantidad_personas * r.servicio_precio)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Método de pago</label>
                  <select className="form-select" value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })}>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="yape">Yape</option>
                    <option value="plin">Plin</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Comprobante</label>
                  <select className="form-select" value={form.tipo_comprobante} onChange={e => setForm({ ...form, tipo_comprobante: e.target.value })}>
                    <option value="boleta">Boleta</option>
                    <option value="factura">Factura</option>
                  </select>
                </div>
              </div>
              {form.id_reserva && (() => {
                const r = reservasPagables.find(x => String(x.id_reserva) === String(form.id_reserva));
                if (!r) return null;
                const total = Number(r.cantidad_personas) * Number(r.servicio_precio);
                return (
                  <div className="pago-box">
                    <div className="row"><span>Cliente</span><strong>{r.cliente_nombre}</strong></div>
                    <div className="row"><span>Servicio</span><strong>{r.servicio_nombre}</strong></div>
                    <div className="row"><span>Personas × precio</span><strong>{r.cantidad_personas} × {money(r.servicio_precio)}</strong></div>
                    <div className="row total"><span>TOTAL A COBRAR</span><strong>{money(total)}</strong></div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={loading}>Cancelar</button>
              <button className="btn btn-primary" onClick={procesar} disabled={loading || !form.id_reserva}>
                {loading ? 'Registrando...' : <><Banknote size={15} /> Registrar Pago</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pago-box {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; font-size: 13px;
        }
        .pago-box .row { display: flex; justify-content: space-between; }
        .pago-box .row span { color: #64748b; }
        .pago-box .row.total { border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 4px; }
        .pago-box .row.total span { color: #0f172a; font-weight: 700; }
        .pago-box .row.total strong { color: #059669; font-size: 17px; }
      `}</style>
    </div>
  );
}
