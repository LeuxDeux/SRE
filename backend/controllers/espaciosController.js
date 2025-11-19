const db = require('../config/database');

const espaciosController = {
  // Obtener todos los espacios activos
  obtenerEspacios: async (req, res) => {
    try {
      const [espacios] = await db.execute(
        `SELECT e.*, s.nombre as secretaria_nombre 
         FROM espacios e 
         LEFT JOIN secretarias s ON e.secretaria_id = s.id 
         WHERE e.activo = TRUE 
         ORDER BY e.nombre`
      );
      res.json(espacios);
    } catch (error) {
      console.error('Error obteniendo espacios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener un espacio específico por ID
  obtenerEspacioPorId: async (req, res) => {
    try {
      const { id } = req.params;
      const [espacios] = await db.execute(
        `SELECT e.*, s.nombre as secretaria_nombre 
         FROM espacios e 
         LEFT JOIN secretarias s ON e.secretaria_id = s.id 
         WHERE e.id = ? AND e.activo = TRUE`,
        [id]
      );
      
      if (espacios.length === 0) {
        return res.status(404).json({ error: 'Espacio no encontrado' });
      }
      
      res.json(espacios[0]);
    } catch (error) {
      console.error('Error obteniendo espacio:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Obtener recursos de un espacio específico
  obtenerRecursosDeEspacio: async (req, res) => {
    try {
      const { id } = req.params;
      const [recursos] = await db.execute(
        `SELECT r.*, er.cantidad_maxima
         FROM espacios_recursos er
         JOIN recursos r ON er.recurso_id = r.id
         WHERE er.espacio_id = ? AND er.disponible = TRUE AND r.activo = TRUE
         ORDER BY r.nombre`,
        [id]
      );
      
      res.json(recursos);
    } catch (error) {
      console.error('Error obteniendo recursos del espacio:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = espaciosController;