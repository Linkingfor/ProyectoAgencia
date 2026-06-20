import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, Package, UserCog, LogOut,
  Plane, Search, Bell, ExternalLink, CalendarCheck, Bus, CreditCard, Truck
} from 'lucide-react';
import './Layout.css';

const navItems = [
  { label: 'PRINCIPAL', type: 'header' },
  { to: '/admin',              label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { label: 'OPERACIONES', type: 'header' },
  { to: '/admin/reservas',     label: 'Reservas',   icon: CalendarCheck },
  { to: '/admin/salidas',      label: 'Salidas',    icon: Bus           },
  { to: '/admin/pagos',        label: 'Pagos',      icon: CreditCard    },
  { label: 'CATÁLOGO', type: 'header' },
  { to: '/admin/paquetes',     label: 'Paquetes',   icon: Package },
  { to: '/admin/transporte',   label: 'Transporte', icon: Truck   },
  { label: 'ADMINISTRACIÓN', type: 'header' },
  { to: '/admin/clientes',     label: 'Clientes',   icon: Users   },
  { to: '/admin/trabajadores', label: 'Personal',   icon: UserCog },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  const initial = (usuario?.nombre || 'U')[0].toUpperCase();
  const current = navItems.find(i => i.to && (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

  return (
    <div className="layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo"><Plane size={20} strokeWidth={2.4} /></div>
          <div className="brand-text">
            <span className="brand-name">Agencia Viajes Ica</span>
            <span className="brand-sub">Intranet · Sistema</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, idx) => {
            if (item.type === 'header') return <p key={idx} className="nav-header">{item.label}</p>;
            const Icon = item.icon;
            return (
              <NavLink key={idx} to={item.to} end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><Icon size={18} strokeWidth={2.2} /></span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar c0">{initial}</div>
            <div style={{ minWidth: 0 }}>
              <p className="user-name">{usuario?.nombre || 'Usuario'}</p>
              <p className="user-role">{usuario?.puesto || 'trabajador'}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-search">
            <Search size={16} color="#94a3b8" />
            <input placeholder={`Buscar en ${current?.label?.toLowerCase() || 'el sistema'}...`} />
          </div>
          <div className="topbar-actions">
            <a href="/" target="_blank" rel="noreferrer" className="icon-btn" title="Ver página comercial">
              <ExternalLink size={17} />
            </a>
            <button className="icon-btn" title="Notificaciones">
              <Bell size={17} /><span className="dot" />
            </button>
            <div className="topbar-user" onClick={handleLogout} title="Cerrar sesión">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="name">{usuario?.nombre || 'Usuario'}</span>
                <span className="role">{usuario?.puesto || 'trabajador'}</span>
              </div>
              <div className="avatar avatar-sm c0">{initial}</div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
