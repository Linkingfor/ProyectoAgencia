import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowRight, MapPin, ShieldCheck, Clock, Star,
  Sparkles, Users, Compass
} from 'lucide-react';

const catIcon = (s) => {
  const t = (s.descripcion || s.nombre || '').toLowerCase();
  if (/(buggy|sandboard|cañon|aventura)/.test(t)) return '🏜️';
  if (/(islas|playa|paracas|lobos)/.test(t))      return '🌊';
  if (/(nazca|sobrevuelo|líneas|geoglifo)/.test(t)) return '✈️';
  if (/(viñedo|bodega|pisco|vino)/.test(t))       return '🍷';
  return '📍';
};

export default function Home() {
  const [paquetes, setPaquetes] = useState([]);

  useEffect(() => {
    api.get('/public/catalogo').then(r => setPaquetes(r.data)).catch(() => {});
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-badge"><Sparkles size={14} /> Tu aventura empieza en Ica</span>
          <h1>Descubre el desierto, el mar<br />y la magia del sur del Perú</h1>
          <p>
            Tours a la Huacachina, Islas Ballestas, Líneas de Nazca y las mejores
            bodegas de pisco. Vive experiencias inolvidables con la agencia líder de Ica.
          </p>
          <div className="hero-actions">
            <Link to="/catalogo" className="hero-btn-primary">
              Ver catálogo de tours <ArrowRight size={17} />
            </Link>
            <Link to="/ingresar" className="hero-btn-ghost">Crear mi cuenta</Link>
          </div>
          <div className="hero-stats">
            <div><strong>6+</strong><span>Destinos</span></div>
            <div><strong>500+</strong><span>Viajeros felices</span></div>
            <div><strong>4.9</strong><span>Calificación</span></div>
          </div>
        </div>
      </section>

      <section className="benefits">
        <div className="benefit">
          <div className="benefit-icon blue"><ShieldCheck size={22} /></div>
          <h3>Reservas seguras</h3>
          <p>Tus datos y pagos protegidos con cifrado y autenticación.</p>
        </div>
        <div className="benefit">
          <div className="benefit-icon green"><Clock size={22} /></div>
          <h3>Disponibilidad real</h3>
          <p>Consulta cupos en tiempo real para cada tour y fecha.</p>
        </div>
        <div className="benefit">
          <div className="benefit-icon orange"><Compass size={22} /></div>
          <h3>Guías expertos</h3>
          <p>Personal capacitado que conoce cada rincón de la región.</p>
        </div>
        <div className="benefit">
          <div className="benefit-icon purple"><Users size={22} /></div>
          <h3>Atención personalizada</h3>
          <p>Te acompañamos antes, durante y después de tu viaje.</p>
        </div>
      </section>

      <section className="featured">
        <div className="section-head">
          <div>
            <span className="section-tag">Catálogo</span>
            <h2>Paquetes turísticos destacados</h2>
            <p>Explora nuestras experiencias más solicitadas en Ica y alrededores.</p>
          </div>
          <Link to="/catalogo" className="section-link">Ver todos <ArrowRight size={15} /></Link>
        </div>

        <div className="featured-grid">
          {paquetes.slice(0, 6).map((p, i) => (
            <div key={p.id_servicio} className="pkg-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="pkg-img">{catIcon(p)}</div>
              <div className="pkg-body">
                <h3>{p.nombre}</h3>
                <p>{p.descripcion}</p>
                <div className="pkg-foot">
                  <div className="pkg-price">
                    <span>Desde</span>
                    <strong>S/ {Number(p.precio).toFixed(2)}</strong>
                  </div>
                  <Link to="/catalogo" className="pkg-btn">Ver más <ArrowRight size={13} /></Link>
                </div>
              </div>
            </div>
          ))}
          {paquetes.length === 0 && (
            <p style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
              Cargando paquetes...
            </p>
          )}
        </div>
      </section>

      <section className="cta">
        <div className="cta-box">
          <h2>¿Listo para tu próxima aventura?</h2>
          <p>Crea tu cuenta y mantente al día con nuestras promociones y nuevos destinos.</p>
          <Link to="/ingresar" className="hero-btn-primary">
            Crear cuenta gratis <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <style>{`
        .home { animation: fadeIn 0.4s ease; }

        /* HERO */
        .hero { position: relative; padding: 90px 40px 80px; overflow: hidden; }
        .hero-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 75% 25%, #6366f1 0%, transparent 55%),
            linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
        }
        .hero-overlay {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320' preserveAspectRatio='none'%3E%3Cpath fill='%23ffffff' fill-opacity='0.05' d='M0,200 C360,120 720,260 1440,160 L1440,320 L0,320 Z'/%3E%3C/svg%3E") no-repeat bottom / cover;
        }
        .hero-content { position: relative; max-width: 760px; margin: 0 auto; text-align: center; color: #fff; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.2);
          padding: 7px 16px; border-radius: var(--r-full);
          font-size: 13px; font-weight: 600; margin-bottom: 20px;
        }
        .hero-content h1 {
          font-size: 44px; font-weight: 800; color: #fff;
          line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 18px;
        }
        .hero-content > p { font-size: 16px; line-height: 1.6; color: #dbeafe; margin-bottom: 28px; }
        .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .hero-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #fff; color: var(--primary);
          padding: 14px 26px; border-radius: var(--r);
          font-size: 15px; font-weight: 700; text-decoration: none;
          box-shadow: 0 14px 30px -10px rgba(0,0,0,0.4); transition: all var(--t);
        }
        .hero-btn-primary:hover { transform: translateY(-2px); color: var(--primary-dark); }
        .hero-btn-ghost {
          display: inline-flex; align-items: center;
          padding: 14px 26px; border-radius: var(--r);
          border: 1.5px solid rgba(255,255,255,0.4); color: #fff;
          font-size: 15px; font-weight: 600; text-decoration: none;
          transition: all var(--t);
        }
        .hero-btn-ghost:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .hero-stats {
          display: flex; gap: 44px; justify-content: center; margin-top: 44px;
          padding-top: 32px; border-top: 1px solid rgba(255,255,255,0.15);
        }
        .hero-stats div { display: flex; flex-direction: column; }
        .hero-stats strong { font-size: 30px; font-weight: 800; }
        .hero-stats span { font-size: 13px; color: #bfdbfe; }

        /* BENEFICIOS */
        .benefits {
          max-width: 1100px; margin: -40px auto 0;
          position: relative; z-index: 2;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px;
          padding: 0 40px;
        }
        .benefit {
          background: #fff; border: 1px solid var(--border-soft);
          border-radius: var(--r-lg); padding: 24px;
          box-shadow: var(--shadow-md); transition: transform var(--t);
        }
        .benefit:hover { transform: translateY(-4px); }
        .benefit-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; margin-bottom: 14px;
        }
        .benefit-icon.blue   { background: linear-gradient(135deg,#3b82f6,#2563eb); }
        .benefit-icon.green  { background: linear-gradient(135deg,#10b981,#059669); }
        .benefit-icon.orange { background: linear-gradient(135deg,#fbbf24,#f59e0b); }
        .benefit-icon.purple { background: linear-gradient(135deg,#a78bfa,#8b5cf6); }
        .benefit h3 { font-size: 15px; margin-bottom: 6px; }
        .benefit p { font-size: 13px; color: var(--text-muted); line-height: 1.55; }

        /* SECCIONES */
        .featured { max-width: 1100px; margin: 70px auto 0; padding: 0 40px; }
        .section-head {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px; gap: 20px; flex-wrap: wrap;
        }
        .section-tag {
          font-size: 12px; font-weight: 700; color: var(--primary);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .section-head h2 { font-size: 28px; letter-spacing: -0.02em; margin: 6px 0 4px; }
        .section-head p { font-size: 14px; color: var(--text-muted); }
        .section-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 14px; font-weight: 600; color: var(--primary); text-decoration: none;
          white-space: nowrap;
        }

        .featured-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px;
        }
        .pkg-card {
          background: #fff; border: 1px solid var(--border-soft);
          border-radius: var(--r-lg); overflow: hidden;
          box-shadow: var(--shadow-sm); transition: all var(--t);
          animation: fadeUp 0.5s ease both;
        }
        .pkg-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--primary-200); }
        .pkg-img {
          height: 150px; font-size: 64px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
        }
        .pkg-body { padding: 18px 20px 20px; }
        .pkg-body h3 { font-size: 16px; margin-bottom: 6px; }
        .pkg-body > p {
          font-size: 13px; color: var(--text-muted); line-height: 1.55;
          margin-bottom: 16px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          min-height: 40px;
        }
        .pkg-foot { display: flex; justify-content: space-between; align-items: flex-end; }
        .pkg-price span { font-size: 11px; color: var(--text-subtle); display: block; }
        .pkg-price strong { font-size: 19px; color: var(--primary); }
        .pkg-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--primary-50); color: var(--primary);
          padding: 9px 14px; border-radius: var(--r);
          font-size: 13px; font-weight: 600; text-decoration: none;
          transition: all var(--t-fast);
        }
        .pkg-btn:hover { background: var(--primary); color: #fff; }

        /* CTA */
        .cta { max-width: 1100px; margin: 70px auto 0; padding: 0 40px; }
        .cta-box {
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          border-radius: var(--r-xl); padding: 50px 40px; text-align: center;
          color: #fff;
        }
        .cta-box h2 { color: #fff; font-size: 26px; margin-bottom: 8px; }
        .cta-box p { color: #dbeafe; font-size: 15px; margin-bottom: 22px; }

        @media (max-width: 900px) {
          .benefits { grid-template-columns: repeat(2, 1fr); }
          .featured-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .hero { padding: 60px 20px 70px; }
          .hero-content h1 { font-size: 30px; }
          .hero-stats { gap: 24px; }
          .benefits { grid-template-columns: 1fr; padding: 0 20px; }
          .featured, .cta { padding: 0 20px; }
          .featured-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
