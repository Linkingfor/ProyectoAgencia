import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, User, LogOut, MapPin, Phone, Mail, Globe, MessageCircle } from 'lucide-react';

export default function ComercialLayout() {
  const { usuario, esCliente, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="cml">
      {/* ── NAVBAR ── */}
      <header className="cml-nav">
        <Link to="/" className="cml-brand">
          <div className="cml-logo"><Plane size={20} strokeWidth={2.4} /></div>
          <div className="cml-brand-txt">
            <span className="cml-brand-name">Agencia de Viajes Ica</span>
            <span className="cml-brand-sub">Descubre el sur del Perú</span>
          </div>
        </Link>

        <nav className="cml-links">
          <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>Inicio</NavLink>
          <NavLink to="/catalogo" className={({isActive}) => isActive ? 'active' : ''}>Catálogo</NavLink>
          {esCliente && <NavLink to="/mi-cuenta" className={({isActive}) => isActive ? 'active' : ''}>Mi cuenta</NavLink>}
        </nav>

        <div className="cml-actions">
          {esCliente ? (
            <>
              <Link to="/mi-cuenta" className="cml-user">
                <div className="cml-avatar">{(usuario?.nombre || 'C')[0].toUpperCase()}</div>
                <span>{usuario?.nombre?.split(' ')[0]}</span>
              </Link>
              <button className="cml-btn-ghost" onClick={handleLogout} title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/ingresar" className="cml-btn-primary">
              <User size={15} /> Ingresar
            </Link>
          )}
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main className="cml-main">
        <Outlet />
      </main>

      {/* ── FOOTER ── */}
      <footer className="cml-footer">
        <div className="cml-footer-grid">
          <div>
            <div className="cml-brand" style={{ marginBottom: 12 }}>
              <div className="cml-logo"><Plane size={18} strokeWidth={2.4} /></div>
              <span className="cml-brand-name" style={{ color: '#fff' }}>Agencia de Viajes Ica</span>
            </div>
            <p className="cml-footer-desc">
              Tu mejor experiencia turística en Ica, Paracas y Nazca. Tours, aventura y cultura desde 2026.
            </p>
            <div className="cml-social">
              <a href="#" onClick={e=>e.preventDefault()}><Globe size={16} /></a>
              <a href="#" onClick={e=>e.preventDefault()}><MessageCircle size={16} /></a>
            </div>
          </div>
          <div>
            <h4>Enlaces</h4>
            <Link to="/">Inicio</Link>
            <Link to="/catalogo">Catálogo de tours</Link>
            <Link to="/ingresar">Mi cuenta</Link>
          </div>
          <div>
            <h4>Contacto</h4>
            <span><MapPin size={14} /> Av. Grau 123, Ica - Perú</span>
            <span><Phone size={14} /> +51 956 000 000</span>
            <span><Mail size={14} /> contacto@agenciaica.com</span>
          </div>
        </div>
        <div className="cml-footer-bottom">
          <span>© 2026 Agencia de Viajes Ica · Proyecto Universitario UTP</span>
          <Link to="/admin/login" className="cml-intranet-link">Acceso intranet</Link>
        </div>
      </footer>

      <style>{`
        .cml { min-height: 100vh; display: flex; flex-direction: column; background: #fff; }

        /* NAVBAR */
        .cml-nav {
          display: flex; align-items: center; gap: 24px;
          padding: 14px 40px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-soft);
          position: sticky; top: 0; z-index: 50;
        }
        .cml-brand { display: flex; align-items: center; gap: 11px; text-decoration: none; }
        .cml-logo {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; box-shadow: var(--shadow-blue);
        }
        .cml-brand-txt { display: flex; flex-direction: column; }
        .cml-brand-name { font-size: 15px; font-weight: 800; color: var(--text-strong); letter-spacing: -0.02em; }
        .cml-brand-sub  { font-size: 11px; color: var(--text-muted); }

        .cml-links { display: flex; gap: 6px; margin-left: 16px; }
        .cml-links a {
          padding: 8px 16px; border-radius: var(--r);
          font-size: 14px; font-weight: 600; color: var(--text-muted);
          text-decoration: none; transition: all var(--t-fast);
        }
        .cml-links a:hover  { color: var(--primary); background: var(--primary-50); }
        .cml-links a.active { color: var(--primary); background: var(--primary-50); }

        .cml-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .cml-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 18px; border-radius: var(--r);
          background: var(--primary); color: #fff;
          font-size: 13.5px; font-weight: 600; text-decoration: none;
          box-shadow: var(--shadow-blue); transition: all var(--t-fast);
        }
        .cml-btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); color: #fff; }
        .cml-btn-ghost {
          width: 38px; height: 38px; border-radius: var(--r);
          border: 1px solid var(--border); background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted); cursor: pointer; transition: all var(--t-fast);
        }
        .cml-btn-ghost:hover { color: var(--danger); border-color: var(--danger); }
        .cml-user {
          display: flex; align-items: center; gap: 9px;
          padding: 5px 14px 5px 5px; border-radius: var(--r-full);
          border: 1px solid var(--border); text-decoration: none;
          font-size: 13.5px; font-weight: 600; color: var(--text-strong);
          transition: all var(--t-fast);
        }
        .cml-user:hover { border-color: var(--primary); color: var(--primary); }
        .cml-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #60a5fa, #2563eb);
          color: #fff; font-weight: 700; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
        }

        .cml-main { flex: 1; }

        /* FOOTER */
        .cml-footer { background: #0f172a; color: #cbd5e1; margin-top: 60px; }
        .cml-footer-grid {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 40px;
          padding: 48px 40px 32px;
        }
        .cml-footer-desc { font-size: 13px; line-height: 1.6; color: #94a3b8; margin-top: 4px; max-width: 320px; }
        .cml-footer h4 { color: #fff; font-size: 14px; margin-bottom: 14px; }
        .cml-footer-grid > div > a, .cml-footer-grid > div > span {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #94a3b8; text-decoration: none;
          margin-bottom: 9px;
        }
        .cml-footer-grid > div > a:hover { color: #fff; }
        .cml-social { display: flex; gap: 8px; margin-top: 14px; }
        .cml-social a {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          color: #cbd5e1; transition: all var(--t-fast);
        }
        .cml-social a:hover { background: var(--primary); color: #fff; }
        .cml-footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 18px 40px;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 12px; color: #64748b;
          max-width: 1100px; margin: 0 auto;
        }
        .cml-intranet-link { color: #64748b; text-decoration: none; }
        .cml-intranet-link:hover { color: #94a3b8; }

        @media (max-width: 768px) {
          .cml-nav { padding: 12px 18px; gap: 12px; flex-wrap: wrap; }
          .cml-links { margin-left: 0; order: 3; width: 100%; }
          .cml-footer-grid { grid-template-columns: 1fr; gap: 28px; padding: 36px 24px 24px; }
          .cml-footer-bottom { flex-direction: column; gap: 8px; padding: 18px 24px; }
        }
      `}</style>
    </div>
  );
}
