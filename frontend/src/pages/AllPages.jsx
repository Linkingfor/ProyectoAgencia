import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Pencil, Package, Search, Power, Users, ShieldCheck,
  Briefcase, Wrench, Bus, Mail, Phone, Trash2, UserCog,
  DollarSign, Clock, Eye, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const avatarColor = (str = '') => 'c' + ((str.charCodeAt(0) || 0) % 8);
const initials = (name = '') => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
const money = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

const catIcon = (s) => {
  const t = (s.descripcion || s.nombre || '').toLowerCase();
  if (/(buggy|sandboard|cañon|aventura|expedic)/.test(t)) return '🏜️';
  if (/(islas|playa|paracas|lobos)/.test(t)) return '🌊';
  if (/(nazca|sobrevuelo|líneas|geoglifo)/.test(t)) return '✈️';
  if (/(viñedo|bodega|pisco|vino)/.test(t)) return '🍷';
  return '📦';
};
const catLabel = (s) => {
  const t = (s.descripcion || s.nombre || '').toLowerCase();
  if (/(buggy|sandboard|cañon|aventura|expedic)/.test(t)) return { txt: 'Aventura', cls: 'badge-yellow' };
  if (/(islas|playa|paracas|lobos)/.test(t)) return { txt: 'Naturaleza', cls: 'badge-green' };
  if (/(nazca|sobrevuelo|líneas|geoglifo)/.test(t)) return { txt: 'Arqueológico', cls: 'badge-purple' };
  if (/(viñedo|bodega|pisco|vino)/.test(t)) return { txt: 'Cultural', cls: 'badge-pink' };
  return { txt: 'General', cls: 'badge-blue' };
};

// ---- Paquetes turísticos ----
const EMPTY_PKG = { nombre: '', descripcion: '', precio: '', capacidad: '', estado: 'activo' };

export function Paquetes() {
  const [items, setItems]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY_PKG);
  const [editId, setEditId] = useState(null);
  const [q, setQ]           = useState('');

  // RFC-001: horarios por servicio
  const [horModal, setHorModal]   = useState(null); // servicio seleccionado
  const [horarios, setHorarios]   = useState([]);
  const [horForm, setHorForm]     = useState({ hora_inicio: '', hora_fin: '' });
  const [horEditId, setHorEditId] = useState(null);
  const fmtHora = (h) => h ? h.slice(0, 5) : '--:--';

  const load = () => api.get('/servicios').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openHorarios = (s) => {
    setHorModal(s);
    setHorForm({ hora_inicio: '', hora_fin: '' });
    setHorEditId(null);
    api.get(`/horarios?id_servicio=${s.id_servicio}`).then(r => setHorarios(r.data));
  };
  const reloadHorarios = () => api.get(`/horarios?id_servicio=${horModal.id_servicio}`).then(r => setHorarios(r.data));

  const saveHorario = async () => {
    if (!horForm.hora_inicio || !horForm.hora_fin) return toast.error('Hora de inicio y fin son requeridas.');
    try {
      if (horEditId) {
        await api.put(`/horarios/${horEditId}`, { ...horForm, estado: 'Activo' });
        toast.success('Horario actualizado.');
      } else {
        await api.post('/horarios', { id_servicio: horModal.id_servicio, ...horForm, estado: 'Activo' });
        toast.success('Horario agregado.');
      }
      setHorForm({ hora_inicio: '', hora_fin: '' }); setHorEditId(null);
      reloadHorarios();
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };
  const editHorario = (h) => { setHorForm({ hora_inicio: h.hora_inicio?.slice(0,5), hora_fin: h.hora_fin?.slice(0,5) }); setHorEditId(h.id_horario); };
  const deleteHorario = async (h) => {
    if (!confirm('¿Eliminar este horario?')) return;
    try { await api.delete(`/horarios/${h.id_horario}`); toast.success('Horario eliminado.'); reloadHorarios(); }
    catch (err) { toast.error(err.response?.data?.error || 'No se pudo eliminar.'); }
  };

  const openCreate = () => { setForm(EMPTY_PKG); setEditId(null); setModal(true); };
  const openEdit   = (s) => {
    setForm({ nombre: s.nombre, descripcion: s.descripcion || '', precio: s.precio, capacidad: s.capacidad, estado: s.estado });
    setEditId(s.id_servicio); setModal(true);
  };

  const save = async () => {
    if (!form.nombre || form.precio === '' || form.capacidad === '') {
      return toast.error('Nombre, precio y capacidad son requeridos.');
    }
    try {
      if (editId) {
        await api.put(`/servicios/${editId}`, form); toast.success('Paquete actualizado.');
        setModal(false); load();
      } else {
        const { data } = await api.post('/servicios', form);
        toast.success('Paquete creado. Ahora agrega sus horarios de salida.');
        setModal(false); load();
        // Abrimos directo el modal de horarios para que registre los horarios del nuevo paquete
        openHorarios({ id_servicio: data.id, nombre: form.nombre });
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Error.'); }
  };

  const toggle = async (s) => {
    try {
      const estado = s.estado === 'activo' ? 'inactivo' : 'activo';
      await api.put(`/servicios/${s.id_servicio}`, { ...s, estado });
      toast.success(`Paquete ${estado === 'activo' ? 'activado' : 'desactivado'}.`);
      load();
    } catch { toast.error('No se pudo actualizar.'); }
  };

  const filtered = items.filter(s => !q || (s.nombre + ' ' + (s.descripcion || '')).toLowerCase().includes(q.toLowerCase()));
  const activos = items.filter(s => s.estado === 'activo').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Paquetes Turísticos</h1>
          <p className="page-subtitle">Catálogo de tours y servicios de la agencia</p>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <Search size={16} color="#94a3b8" />
            <input placeholder="Buscar paquete..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nuevo Paquete</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Total paquetes</p><p className="stat-value">{items.length}</p></div>
          <div className="stat-icon blue"><Package size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Activos</p><p className="stat-value">{activos}</p></div>
          <div className="stat-icon green"><Eye size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Inactivos</p><p className="stat-value">{items.length - activos}</p></div>
          <div className="stat-icon orange"><Power size={20} /></div>
        </div>
      </div>

      <div className="paq-grid">
        {filtered.map((s, i) => {
          const cat = catLabel(s);
          return (
            <div key={s.id_servicio} className="paq-card" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="paq-head">
                <div className="paq-icon">{catIcon(s)}</div>
                <span className={`badge ${s.estado === 'activo' ? 'badge-green' : 'badge-gray'}`}>
                  <span className="badge-dot" /> {s.estado}
                </span>
              </div>
              <h3 className="paq-title">{s.nombre}</h3>
              <span className={`badge ${cat.cls}`} style={{ marginBottom: 10 }}>{cat.txt}</span>
              <p className="paq-desc">{s.descripcion || 'Sin descripción.'}</p>
              <div className="paq-meta">
                <span><DollarSign size={13} color="#10b981" /> <strong>{money(s.precio)}</strong></span>
                <span><Users size={13} color="#94a3b8" /> {s.capacidad} pax</span>
              </div>
              <div className="paq-actions">
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(s)}>
                  <Pencil size={13} /> Editar
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => openHorarios(s)} title="Ver horarios">
                  <Clock size={13} /> Horarios
                </button>
                <button className="btn-icon" onClick={() => toggle(s)} title={s.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  style={{ color: s.estado === 'activo' ? '#10b981' : '#94a3b8' }}>
                  <Power size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="icon"><Package size={26} /></div>
            <h3>Sin paquetes</h3><p>Crea tu primer paquete turístico.</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editId ? 'Editar Paquete' : 'Nuevo Paquete'}</h3>
            <p className="modal-desc">Define el tour y sus características principales.</p>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre del tour</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Huacachina & Buggies" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Breve descripción..." />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Precio (S/)</label>
                  <input type="number" className="form-input" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="180" />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacidad máx.</label>
                  <input type="number" className="form-input" value={form.capacidad} onChange={e => setForm({ ...form, capacidad: e.target.value })} placeholder="20" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              {!editId && (
                <p className="form-hint">Después de crear el paquete podrás registrar sus horarios de salida.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {horModal && (
        <div className="modal-overlay" onClick={() => setHorModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Horarios — {horModal.nombre}</h3>
            <p className="modal-desc">Horas de inicio y fin de cada salida que maneja este paquete.</p>
            <div className="modal-body">
              <div className="hor-list">
                {horarios.length === 0 && <p className="muted" style={{ padding: '8px 0' }}>Sin horarios registrados todavía.</p>}
                {horarios.map(h => (
                  <div key={h.id_horario} className="hor-row">
                    <Clock size={14} color="#2563eb" />
                    <span>{fmtHora(h.hora_inicio)} – {fmtHora(h.hora_fin)}</span>
                    <span className={`badge ${h.estado === 'Activo' ? 'badge-green' : 'badge-gray'}`}>{h.estado}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => editHorario(h)}><Pencil size={13} /></button>
                      <button className="btn-icon" onClick={() => deleteHorario(h)} style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="form-group">
                  <label className="form-label">Hora inicio</label>
                  <input type="time" className="form-input" value={horForm.hora_inicio} onChange={e => setHorForm({ ...horForm, hora_inicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora fin</label>
                  <input type="time" className="form-input" value={horForm.hora_fin} onChange={e => setHorForm({ ...horForm, hora_fin: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={saveHorario}>
                <Plus size={14} /> {horEditId ? 'Actualizar horario' : 'Agregar horario'}
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setHorModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .paq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
        .paq-card {
          background: #fff; border: 1px solid var(--border-soft); border-radius: 14px;
          padding: 20px; box-shadow: var(--shadow-sm); transition: all 0.25s ease;
          animation: fadeUp 0.4s ease both; display: flex; flex-direction: column;
        }
        .paq-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--primary-200); }
        .paq-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .paq-icon {
          width: 48px; height: 48px; border-radius: 12px; font-size: 26px;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          display: flex; align-items: center; justify-content: center;
        }
        .paq-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
        .paq-desc {
          font-size: 12.5px; color: var(--text-muted); line-height: 1.55; margin-bottom: 14px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          min-height: 38px;
        }
        .paq-meta {
          display: flex; gap: 16px; padding: 12px 0; margin-bottom: 12px;
          border-top: 1px solid var(--border-soft); font-size: 12.5px;
        }
        .paq-meta span { display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); }
        .paq-actions { display: flex; gap: 6px; margin-top: auto; }

        .hor-list { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
        .hor-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; background: var(--bg-soft); border-radius: var(--r);
          font-size: 13px; font-weight: 600;
        }
      `}</style>
    </div>
  );
}

// ---- Trabajadores y accesos ----
const puestos = {
  administrador: { cls: 'badge-purple', icon: ShieldCheck, label: 'Administrador' },
  vendedor:      { cls: 'badge-blue',   icon: Briefcase,   label: 'Vendedor' },
  operador:      { cls: 'badge-yellow', icon: Wrench,      label: 'Operador' },
  guia:          { cls: 'badge-green',  icon: UserCog,     label: 'Guía' },
  chofer:        { cls: 'badge-pink',   icon: Bus,         label: 'Chofer' },
};
const EMPTY_TRAB = { dni: '', nombres: '', puesto: 'vendedor', telefono: '', correo: '', username: '', password: '' };

export function Trabajadores() {
  const [items, setItems]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY_TRAB);
  const [editId, setEditId] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [q, setQ]           = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/trabajadores').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_TRAB); setEditId(null); setModal(true); };
  const openEdit   = (t)  => {
    setForm({ dni: t.dni, nombres: t.nombres, puesto: t.puesto, telefono: t.telefono || '', correo: t.correo || '', username: '', password: '' });
    setEditId(t.id_trabajador); setModal(true);
  };

  const save = async () => {
    if (!form.dni || !form.nombres || !form.puesto) return toast.error('DNI, nombre y puesto son requeridos.');
    if (!editId && form.password && form.password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres.');
    setLoading(true);
    try {
      if (editId) {
        await api.put(`/trabajadores/${editId}`, form);
        toast.success('Trabajador actualizado.');
      } else {
        await api.post('/trabajadores', form);
        toast.success(form.username ? 'Trabajador y acceso creados.' : 'Trabajador registrado.');
      }
      setModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este trabajador y su acceso?')) return;
    try {
      await api.delete(`/trabajadores/${id}`);
      toast.success('Trabajador eliminado.');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo eliminar.'); }
  };

  const counts = useMemo(() => {
    const c = { todos: items.length };
    items.forEach(t => { c[t.puesto] = (c[t.puesto] || 0) + 1; });
    return c;
  }, [items]);

  const filtered = items.filter(t => {
    const okF = filtro === 'todos' || t.puesto === filtro;
    const okQ = !q || (t.nombres + ' ' + (t.dni || '') + ' ' + (t.correo || '')).toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });

  const conAcceso = items.filter(t => t.username).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Personal</h1>
          <p className="page-subtitle">Registro de trabajadores y accesos a la intranet</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nuevo Personal</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Total Personal</p><p className="stat-value">{items.length}</p></div>
          <div className="stat-icon blue"><Users size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Administradores</p><p className="stat-value">{counts.administrador || 0}</p></div>
          <div className="stat-icon purple"><ShieldCheck size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Con acceso intranet</p><p className="stat-value">{conAcceso}</p></div>
          <div className="stat-icon green"><KeyRound size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Operativos</p><p className="stat-value">{(counts.guia || 0) + (counts.chofer || 0) + (counts.operador || 0)}</p></div>
          <div className="stat-icon orange"><Wrench size={20} /></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: '1 1 240px' }}>
            <Search size={16} color="#94a3b8" />
            <input placeholder="Buscar por nombre o documento..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="tabs-pill">
            <button className={`tab-pill ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
            <button className={`tab-pill ${filtro === 'administrador' ? 'active' : ''}`} onClick={() => setFiltro('administrador')}>Admin</button>
            <button className={`tab-pill ${filtro === 'vendedor' ? 'active' : ''}`} onClick={() => setFiltro('vendedor')}>Vendedor</button>
            <button className={`tab-pill ${filtro === 'operador' ? 'active' : ''}`} onClick={() => setFiltro('operador')}>Operador</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Empleado</th><th>Documento</th><th>Puesto</th><th>Contacto</th><th>Acceso intranet</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const p = puestos[t.puesto] || { cls: 'badge-gray', icon: Briefcase, label: t.puesto };
                const Icon = p.icon;
                return (
                  <tr key={t.id_trabajador}>
                    <td>
                      <div className="user-cell">
                        <div className={`avatar ${avatarColor(t.nombres)}`}>{initials(t.nombres)}</div>
                        <div className="user-cell-info">
                          <span className="user-cell-name">{t.nombres}</span>
                          <span className="user-cell-sub">{t.correo || 'Sin correo'}</span>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{t.dni}</span></td>
                    <td><span className={`badge ${p.cls}`}><Icon size={11} /> {p.label}</span></td>
                    <td>{t.telefono ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="#94a3b8" /> {t.telefono}</span> : <span className="muted">—</span>}</td>
                    <td>
                      {t.username
                        ? <span className="badge badge-green"><KeyRound size={11} /> @{t.username}</span>
                        : <span className="badge badge-gray">Sin acceso</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn-icon" onClick={() => openEdit(t)} title="Editar"><Pencil size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(t.id_trabajador)} title="Eliminar"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6}><div className="empty-state"><div className="icon"><Users size={26} /></div><h3>Sin personal</h3><p>Registra tu primer trabajador.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editId ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h3>
            <p className="modal-desc">
              {editId ? 'Actualiza los datos del trabajador.' : 'Registra un trabajador. Si le asignas usuario y contraseña, tendrá acceso a la intranet.'}
            </p>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nombres completos <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="form-input" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })} placeholder="Roberto Salas Vega" />
                </div>
                <div className="form-group">
                  <label className="form-label">DNI <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="form-input" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} placeholder="10234567" />
                </div>
                <div className="form-group">
                  <label className="form-label">Puesto <span style={{ color: '#ef4444' }}>*</span></label>
                  <select className="form-select" value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })}>
                    <option value="administrador">Administrador</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="operador">Operador</option>
                    <option value="guia">Guía</option>
                    <option value="chofer">Chofer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="987 000 000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo</label>
                  <input className="form-input" type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} placeholder="nombre@agenciaica.com" />
                </div>
              </div>

              {!editId && (
                <div className="acceso-box">
                  <div className="acceso-head">
                    <KeyRound size={15} />
                    <span>Acceso a la intranet <em>(opcional)</em></span>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Usuario</label>
                      <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="rsalas" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contraseña</label>
                      <input type="password" className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                    </div>
                  </div>
                  <p className="form-hint">Si dejas estos campos vacíos, el trabajador se registra sin acceso al sistema.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .acceso-box {
          background: var(--bg-soft); border: 1px solid var(--border-soft);
          border-radius: var(--r); padding: 16px; margin-top: 4px;
        }
        .acceso-head {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700; color: var(--text-strong);
          margin-bottom: 12px;
        }
        .acceso-head em { font-weight: 500; color: var(--text-muted); font-style: normal; }
      `}</style>
    </div>
  );
}
