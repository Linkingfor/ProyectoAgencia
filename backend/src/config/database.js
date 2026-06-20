const { Pool, types } = require('pg');

// DATE (OID 1082) → devolver como texto 'YYYY-MM-DD' (evita desfase de zona horaria)
types.setTypeParser(1082, (val) => val);
// TIME (OID 1083) → recortar a 'HH:MM'
types.setTypeParser(1083, (val) => (val ? val.slice(0, 5) : val));

const pool = new Pool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'agenciaviajes_db',
  max: 10,
  idleTimeoutMillis: 30000,
});

const testConnection = async () => {
  try {
    const r = await pool.query('SELECT NOW() AS now');
    console.log(`✅ PostgreSQL conectado → ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    return r.rows;
  } catch (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    console.error('   Verifica que PostgreSQL esté corriendo y las credenciales en .env sean correctas.');
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
