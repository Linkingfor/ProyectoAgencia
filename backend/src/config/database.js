const { Pool, types } = require('pg');

// DATE (OID 1082) → devolver como texto 'YYYY-MM-DD'
types.setTypeParser(1082, (val) => val);

// TIME (OID 1083) → recortar a 'HH:MM'
types.setTypeParser(1083, (val) => (val ? val.slice(0, 5) : val));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Falta la variable DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }   // Render exige SSL en producción
    : false,                          // Postgres local no usa SSL
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const testConnection = async () => {
  try {
    const r = await pool.query('SELECT NOW() AS now');
    console.log('✅ PostgreSQL conectado correctamente');
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    return r.rows;
  } catch (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    console.error('   Verifica DATABASE_URL');
    process.exit(1);
  }
};

module.exports = { pool, testConnection };