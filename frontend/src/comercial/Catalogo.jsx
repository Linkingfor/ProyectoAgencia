import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Search, Users, Clock, ArrowRight, Info } from 'lucide-react';
import Compra from './Compra';

const categorias = ['Todos', 'Aventura', 'Naturaleza', 'Arqueológico', 'Cultural'];

const detectarCat = (s) => {
  const t = (s.descripcion || s.nombre || '').toLowerCase();
  if (/(buggy|sandboard|cañon|aventura|expedic)/.test(t)) return 'Aventura';
  if (/(islas|playa|paracas|lobos|naturaleza)/.test(t))   return 'Naturaleza';
  if (/(nazca|sobrevuelo|líneas|geoglifo)/.test(t))       return 'Arqueológico';
  if (/(viñedo|bodega|pisco|vino|cultura)/.test(t))       return 'Cultural';
  return 'Aventura';
};
const catIcon = { Aventura: '🏜️', Naturaleza: '🌊', Arqueológico: '✈️', Cultural: '🍷' };
const catColor = { Aventura: 'badge-yellow', Naturaleza: 'badge-green', Arqueológico: 'badge-purple', Cultural: 'badge-pink' };

export default function Catalogo() {
  const { esCliente } = useAuth();
  const [paquetes, setPaquetes] = useState([]);
  const [cat, setCat] = useState('Todos');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [comprando, setComprando] = useState(null); // paquete seleccionado para compra

  useEffect(() => {
    api.get('/public/catalogo')
      .then(r => setPaquetes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtrados = useMemo(() => paquetes.filter(p => {
    const c = detectarCat(p);
    const okCat = cat === 'Todos' || c === cat;
    const okQ = !q || (p.nombre + ' ' + (p.descripcion || '')).toLowerCase().includes(q.toLowerCase());
    return okCat && okQ;
  }), [paquetes, cat, q]);

  return (
    <div className="cat">
      {/* Encabezado */}
      <div className="cat-head">
        <div className="cat-head-inner">
          <span className="cat-tag">Nuestros tours</span>
          <h1>Catálogo de paquetes turísticos</h1>
          <p>Elige tu próxima aventura entre {paquetes.length} experiencias por Ica, Paracas y Nazca.</p>
        </div>
      </div>

      <div className="cat-body">
        {/* Filtros */}
        <div className="cat-filters">
          <div className="search-bar" style={{ flex: '1 1 260px' }}>
            <Search size={16} color="#94a3b8" />
            <input placeholder="Buscar destino..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="tabs-pill">
            {categorias.map(c => (
              <button key={c} className={`tab-pill ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        {!esCliente && (
          <div className="cat-aviso">
            <Info size={16} />
            <span>Inicia sesión o regístrate para reservar tu tour favorito.</span>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="loading-screen" style={{ height: 'auto', padding: 60 }}>
            <div className="spinner" /><p>Cargando catálogo...</p>
          </div>
        ) : (
          <div className="cat-grid">
            {filtrados.map((p, i) => {
              const c = detectarCat(p);
              return (
                <div key={p.id_servicio} className="cat-card" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="cat-card-img">
                    {catIcon[c]}
                    <span className={`badge ${catColor[c]}`} style={{ position: 'absolute', top: 12, left: 12 }}>{c}</span>
                  </div>
                  <div className="cat-card-body">
                    <h3>{p.nombre}</h3>
                    <p>{p.descripcion}</p>
                    <div className="cat-card-meta">
                      <span><Users size={13} /> {p.capacidad} pax máx.</span>
                      <span><Clock size={13} /> 1 día</span>
                    </div>
                    <div className="cat-card-foot">
                      <div className="cat-price">
                        <span>Desde</span>
                        <strong>S/ {Number(p.precio).toFixed(2)}</strong>
                      </div>
                      {esCliente ? (
                        <button className="cat-card-btn" onClick={() => setComprando(p)}>
                          Reservar <ArrowRight size={13} />
                        </button>
                      ) : (
                        <Link to="/ingresar" className="cat-card-btn">
                          Ingresar <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtrados.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <div className="icon"><Search size={26} /></div>
                <h3>Sin resultados</h3>
                <p>Prueba con otra categoría o término de búsqueda.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {comprando && <Compra paquete={comprando} onClose={() => setComprando(null)} />}

      <style>{`
        .cat { animation: fadeIn 0.35s ease; }
        .cat-card-btn { border: none; cursor: pointer; font-family: inherit; }
        .cat-head {
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          padding: 54px 40px;
        }
        .cat-head-inner { max-width: 1100px; margin: 0 auto; color: #fff; }
        .cat-tag { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #bfdbfe; }
        .cat-head h1 { color: #fff; font-size: 32px; letter-spacing: -0.02em; margin: 8px 0 6px; }
        .cat-head p { color: #dbeafe; font-size: 15px; }

        .cat-body { max-width: 1100px; margin: 0 auto; padding: 28px 40px 40px; }
        .cat-filters {
          display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .cat-aviso {
          display: flex; align-items: center; gap: 10px;
          background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af;
          padding: 11px 16px; border-radius: var(--r); font-size: 13px;
          margin-bottom: 24px;
        }

        .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .cat-card {
          background: #fff; border: 1px solid var(--border-soft);
          border-radius: var(--r-lg); overflow: hidden;
          box-shadow: var(--shadow-sm); transition: all var(--t);
          animation: fadeUp 0.5s ease both;
        }
        .cat-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--primary-200); }
        .cat-card-img {
          position: relative; height: 160px; font-size: 70px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
        }
        .cat-card-body { padding: 18px 20px 20px; }
        .cat-card-body h3 { font-size: 16px; margin-bottom: 6px; }
        .cat-card-body > p {
          font-size: 13px; color: var(--text-muted); line-height: 1.55; margin-bottom: 14px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          min-height: 40px;
        }
        .cat-card-meta {
          display: flex; gap: 16px; padding: 12px 0;
          border-top: 1px solid var(--border-soft); margin-bottom: 12px;
        }
        .cat-card-meta span {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; color: var(--text-muted);
        }
        .cat-card-foot { display: flex; justify-content: space-between; align-items: flex-end; }
        .cat-price span { font-size: 11px; color: var(--text-subtle); display: block; }
        .cat-price strong { font-size: 20px; color: var(--primary); }
        .cat-card-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--primary); color: #fff;
          padding: 9px 16px; border-radius: var(--r);
          font-size: 13px; font-weight: 600; text-decoration: none;
          transition: all var(--t-fast);
        }
        .cat-card-btn:hover { background: var(--primary-dark); color: #fff; }

        @media (max-width: 900px) { .cat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) {
          .cat-head { padding: 40px 20px; }
          .cat-body { padding: 24px 20px 32px; }
          .cat-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
