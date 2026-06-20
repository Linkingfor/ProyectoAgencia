require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 3001;

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📋 API disponible en http://localhost:${PORT}/api`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
  });
});
