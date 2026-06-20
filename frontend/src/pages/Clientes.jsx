import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, UserCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const EMPTY = { nombres: '', dni: '', telefono: '', correo: '' };
const avatarColor = (str = '') => 'c' + ((str.charCodeAt(0) || 0) % 8);
const initials = (name = '') => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [loading, setLoading]   = useState(false);

  const load = async (q = '') => {
    const params = q ? `?search=${encodeURIComponent(q)}` : '';
    const { data } = await api.get(`/clientes${params}`);
    setClientes(data);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit   = (c)  => { setForm({ nombres: c.nombres, dni: c.dni, telefono: c.telefono || '', correo: c.correo || '' }); setEditId(c.id_cliente); setModal(true); };

  const handleSave = async () => {
    if (!form.nombres || !form.dni) return toast.error('Nombre y DNI son requeridos.');
    setLoading(true);
    try {
      if (editId) {
        await api.put(`/clientes/${editId}`, form);
        toast.success('Cliente actualizado.');
      } else {
        await api.post('/clientes', form);
        toast.success('Cliente registrado.');
      }
      setModal(false);
      load(search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      toast.success('Cliente eliminado.');
      load(search);
    } catch (err) { toast.error(err.response?.data?.error || 'No se pudo eliminar.'); }
  };

  const conCuenta = clientes.filter(c => c.username).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Registro y gestión de clientes turistas</p>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <Search size={16} color="#94a3b8" />
            <input placeholder="Buscar por nombre, DNI..." value={search}
              onChange={e => { setSearch(e.target.value); load(e.target.value); }} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Total Clientes</p><p className="stat-value">{clientes.length}</p></div>
          <div className="stat-icon blue"><Users size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Con cuenta web</p><p className="stat-value">{conCuenta}</p></div>
          <div className="stat-icon green"><UserCheck size={20} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-info"><p className="stat-label">Solo presencial</p><p className="stat-value">{clientes.length - conCuenta}</p></div>
          <div className="stat-icon orange"><ShieldOff size={20} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <p className="card-title">Lista de Clientes</p>
            <p className="card-subtitle">{clientes.length} {clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Cuenta web</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id_cliente}>
                  <td>
                    <div className="user-cell">
                      <div className={`avatar ${avatarColor(c.nombres)}`}>{initials(c.nombres)}</div>
                      <div className="user-cell-info">
                        <span className="user-cell-name">{c.nombres}</span>
                        <span className="user-cell-sub">{c.correo || 'Sin correo'}</span>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, color: '#475569' }}>{c.dni}</span></td>
                  <td>{c.telefono ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="#94a3b8" /> {c.telefono}</span> : <span className="muted">—</span>}</td>
                  <td>
                    {c.username
                      ? <span className="badge badge-green"><UserCheck size={11} /> @{c.username}</span>
                      : <span className="badge badge-gray">Presencial</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn-icon" onClick={() => openEdit(c)} title="Editar"><Pencil size={15} /></button>
                      <button className="btn-icon danger" onClick={() => handleDelete(c.id_cliente)} title="Eliminar"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div className="icon"><Users size={26} /></div>
                    <h3>No hay clientes registrados</h3>
                    <p>Empieza creando tu primer cliente</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <p className="modal-desc">{editId ? 'Actualiza los datos del cliente.' : 'Registra un nuevo cliente turista (atención presencial).'}</p>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombres completos <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="form-input" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })} placeholder="Juan Pérez García" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">DNI / Pasaporte <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="form-input" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} placeholder="12345678" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="956 000 000" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input className="form-input" type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} placeholder="cliente@email.com" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Crear cliente')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
