
const pool = require('./config/database');

pool.query('SELECT * FROM usuarios', (err, results) => {
  if (err) {
    console.error('Error en query:', err);
  } else {
    console.log('✅ Query de prueba exitosa:', results);
  }
});