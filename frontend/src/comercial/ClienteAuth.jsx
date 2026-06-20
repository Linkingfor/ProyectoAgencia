import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Plane, User, Lock, Mail, Phone, IdCard, Eye, EyeOff } from 'lucide-react';

export default function ClienteAuth() {
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [form, setForm] = useState({
    nombres: '', dni: '', telefono: '', correo: '',
    username: '', password: '', confirmar: ''
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginCliente, registerCliente } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const esReg = modo === 'registro';

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (esReg) {
        if (!form.nombres || !form.dni || !form.username || !form.password) {
          throw { msg: 'Completa todos los campos obligatorios.' };
        }
        if (form.password.length < 6) throw { msg: 'La contraseña debe tener al menos 6 caracteres.' };
        if (form.password !== form.confirmar) throw { msg: 'Las contraseñas no coinciden.' };
        await registerCliente({
          nombres: form.nombres, dni: form.dni,
          telefono: form.telefono, correo: form.correo,
          username: form.username, password: form.password
        });
        toast.success('¡Cuenta creada! Bienvenido.');
      } else {
        await loginCliente(form.username, form.password);
        toast.success('¡Bienvenido de nuevo!');
      }
      navigate('/mi-cuenta');
    } catch (err) {
      toast.error(err.msg || err.response?.data?.error || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cauth">
      <div className="cauth-card">
        <div className="cauth-brand">
          <div className="cauth-logo"><Plane size={24} strokeWidth={2.4} /></div>
          <h1>{esReg ? 'Crea tu cuenta' : 'Bienvenido'}</h1>
          <p>{esReg ? 'Regístrate para reservar tus tours favoritos' : 'Ingresa a tu cuenta de cliente'}</p>
        </div>

        <div className="tabs-pill" style={{ width: '100%', marginBottom: 22 }}>
          <button className={`tab-pill ${!esReg ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setModo('login')}>Iniciar sesión</button>
          <button className={`tab-pill ${esReg ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setModo('registro')}>Registrarme</button>
        </div>

        <form onSubmit={submit} className="cauth-form">
          {esReg && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <div className="input-wrap">
                  <User size={16} className="input-icon" />
                  <input className="form-input" value={form.nombres}
                    onChange={e => set('nombres', e.target.value)} placeholder="Juan Pérez García" required />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">DNI *</label>
                  <div className="input-wrap">
                    <IdCard size={16} className="input-icon" />
                    <input className="form-input" value={form.dni}
                      onChange={e => set('dni', e.target.value)} placeholder="12345678" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <div className="input-wrap">
                    <Phone size={16} className="input-icon" />
                    <input className="form-input" value={form.telefono}
                      onChange={e => set('telefono', e.target.value)} placeholder="956 000 000" />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input type="email" className="form-input" value={form.correo}
                    onChange={e => set('correo', e.target.value)} placeholder="correo@email.com" />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Usuario *</label>
            <div className="input-wrap">
              <User size={16} className="input-icon" />
              <input className="form-input" value={form.username}
                onChange={e => set('username', e.target.value)} placeholder="tu_usuario" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña *</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input type={showPwd ? 'text' : 'password'} className="form-input" style={{ paddingRight: 42 }}
                value={form.password} onChange={e => set('password', e.target.value)}
                placeholder={esReg ? 'Mínimo 6 caracteres' : 'Tu contraseña'} required />
              <button type="button" className="cauth-eye" onClick={() => setShowPwd(s => !s)} tabIndex={-1}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {esReg && (
            <div className="form-group">
              <label className="form-label">Confirmar contraseña *</label>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input type={showPwd ? 'text' : 'password'} className="form-input"
                  value={form.confirmar} onChange={e => set('confirmar', e.target.value)}
                  placeholder="Repite tu contraseña" required />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
            {loading ? 'Procesando...' : (esReg ? 'Crear cuenta' : 'Ingresar')}
          </button>
        </form>

        <p className="cauth-switch">
          {esReg ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
          <button onClick={() => setModo(esReg ? 'login' : 'registro')}>
            {esReg ? 'Inicia sesión' : 'Regístrate aquí'}
          </button>
        </p>
      </div>

      <style>{`
        .cauth {
          min-height: calc(100vh - 73px);
          display: flex; align-items: center; justify-content: center;
          padding: 40px 20px;
          background:
            radial-gradient(ellipse at 30% 20%, #dbeafe 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, #ede9fe 0%, transparent 55%),
            #f5f7fb;
        }
        .cauth-card {
          width: 100%; max-width: 460px;
          background: #fff; border-radius: var(--r-xl);
          padding: 36px 34px 28px;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-soft);
          animation: scaleIn 0.4s ease;
        }
        .cauth-brand { text-align: center; margin-bottom: 22px; }
        .cauth-logo {
          width: 58px; height: 58px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          color: #fff; margin-bottom: 12px;
          box-shadow: var(--shadow-blue);
        }
        .cauth-brand h1 { font-size: 22px; letter-spacing: -0.02em; margin-bottom: 4px; }
        .cauth-brand p { font-size: 13px; color: var(--text-muted); }
        .cauth-form { display: flex; flex-direction: column; gap: 14px; }
        .cauth-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #94a3b8; cursor: pointer;
          display: flex; padding: 4px;
        }
        .cauth-eye:hover { color: var(--primary); }
        .cauth-switch { text-align: center; margin-top: 18px; font-size: 13px; color: var(--text-muted); }
        .cauth-switch button {
          background: none; border: none; color: var(--primary);
          font-weight: 700; font-size: 13px; cursor: pointer;
        }
        .cauth-switch button:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
