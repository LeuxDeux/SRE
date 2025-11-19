const db = require('../config/database');

const recursosController = {
  // Obtener todos los recursos activos
  obtenerRecursos: async (req, res) => {
    try {
      const [recursos] = await db.execute(
        'SELECT * FROM recursos WHERE activo = TRUE ORDER BY nombre'
      );
      res.json(recursos);
    } catch (error) {
      console.error('Error obteniendo recursos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = recursosController;