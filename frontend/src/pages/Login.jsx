import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Plane, User, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin1234');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginTrabajador } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginTrabajador(username, password);
      toast.success('¡Bienvenido a la intranet!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ilogin">
      <div className="ilogin-bg" />
      <div className="ilogin-blob blob-1" />
      <div className="ilogin-blob blob-2" />

      <div className="ilogin-card">
        <Link to="/" className="ilogin-back"><ArrowLeft size={14} /> Ir a la página principal</Link>

        <div className="ilogin-brand">
          <div className="ilogin-logo"><Plane size={26} strokeWidth={2.4} /></div>
          <h1>Intranet · Agencia Ica</h1>
          <p>Sistema de Gestión Interna</p>
        </div>

        <div className="ilogin-chip"><ShieldCheck size={14} /> Acceso exclusivo para personal</div>

        <form onSubmit={handleSubmit} className="ilogin-form">
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <div className="input-wrap">
              <User size={16} className="input-icon" />
              <input className="form-input" value={username}
                onChange={e => setUsername(e.target.value)} placeholder="Ingrese su usuario" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input type={showPwd ? 'text' : 'password'} className="form-input" style={{ paddingRight: 42 }}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña" required />
              <button type="button" className="ilogin-eye" onClick={() => setShowPwd(s => !s)} tabIndex={-1}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 6 }} disabled={loading}>
            {loading ? <><span className="spinner-sm" /> Ingresando...</> : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="ilogin-foot">UTP Ica · 2026 · Proyecto Universitario</p>
      </div>

      <style>{`
        .ilogin {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden; padding: 24px;
        }
        .ilogin-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 25% 30%, #4f7cff 0%, transparent 55%),
            radial-gradient(ellipse at 80% 70%, #6366f1 0%, transparent 55%),
            linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%);
        }
        .ilogin-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.45; animation: float 8s ease-in-out infinite; }
        .blob-1 { width: 320px; height: 320px; background: #3b82f6; top: -90px; left: -90px; }
        .blob-2 { width: 280px; height: 280px; background: #8b5cf6; bottom: -70px; right: -70px; animation-delay: 2.5s; }

        .ilogin-card {
          position: relative; z-index: 2;
          background: rgba(255,255,255,0.98); backdrop-filter: blur(20px);
          border-radius: 20px; padding: 34px 34px 28px;
          width: 100%; max-width: 410px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.2);
          animation: scaleIn 0.45s cubic-bezier(0.16,1,0.3,1);
        }
        .ilogin-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: #64748b; text-decoration: none;
          margin-bottom: 18px;
        }
        .ilogin-back:hover { color: #2563eb; }
        .ilogin-brand { text-align: center; margin-bottom: 14px; }
        .ilogin-logo {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          color: #fff; margin-bottom: 12px;
          box-shadow: 0 12px 24px -8px rgba(37,99,235,0.5);
          animation: float 3.5s ease-in-out infinite;
        }
        .ilogin-brand h1 { font-size: 20px; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 3px; }
        .ilogin-brand p { font-size: 13px; color: #64748b; }
        .ilogin-chip {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;
          padding: 8px; border-radius: var(--r); font-size: 12px; font-weight: 600;
          margin-bottom: 20px;
        }
        .ilogin-form { display: flex; flex-direction: column; gap: 15px; }
        .ilogin-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; padding: 4px;
        }
        .ilogin-eye:hover { color: #2563eb; }
        .ilogin-foot { text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; }
        .spinner-sm {
          width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff; border-radius: 50%; display: inline-block;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </div>
  );
}
