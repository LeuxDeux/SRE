// backend/controllers/reservasRecursosController.js
const pool = require('../config/database');

const reservasRecursosController = {
  /**
   * CONTROLADOR: obtenerRecursosDeReserva
   * Obtiene todos los recursos solicitados en una reserva
   * Ruta: GET /api/reservas/:reservaId/recursos
   */
  obtenerRecursosDeReserva: async (req, res) => {
    try {
      const { reservaId } = req.params;

      // Verificar que la reserva existe
      const [reserva] = await pool.query(
        'SELECT id, espacio_id FROM reservas WHERE id = ?',
        [reservaId]
      );

      if (reserva.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Reserva no encontrada'
        });
      }

      const especioId = reserva[0].espacio_id;

      // Obtener recursos de la reserva con información completa
      const [recursosReservados] = await pool.query(
        `SELECT 
          rr.id,
          rr.recurso_id,
          rr.cantidad_solicitada,
          rr.cantidad_confirmada,
          rr.observaciones,
          r.nombre as recurso_nombre,
          r.descripcion as recurso_descripcion,
          r.cantidad_total,
          er.cantidad_maxima
         FROM reservas_recursos rr
         JOIN recursos r ON rr.recurso_id = r.id
         LEFT JOIN espacios_recursos er ON er.espacio_id = ? AND er.recurso_id = r.id
         WHERE rr.reserva_id = ?
         ORDER BY r.nombre`,
        [especioId, reservaId]
      );

      res.json({
        success: true,
        recursos: recursosReservados
      });
    } catch (error) {
      console.error('Error obteniendo recursos de reserva:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * CONTROLADOR: agregarRecursoAReserva
   * Agrega uno o más recursos a una reserva
   * Ruta: POST /api/reservas/:reservaId/recursos
   */
  agregarRecursoAReserva: async (req, res) => {
    try {
      const { reservaId } = req.params;
      const { recursos } = req.body; // Array de {recurso_id, cantidad_solicitada, observaciones}

      // Verificar que la reserva existe y obtener espacio_id
      const [reserva] = await pool.query(
        'SELECT id, espacio_id FROM reservas WHERE id = ?',
        [reservaId]
      );

      if (reserva.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Reserva no encontrada'
        });
      }

      const espacioId = reserva[0].espacio_id;

      for (const recurso of recursos) {
        const { recurso_id, cantidad_solicitada, observaciones } = recurso;

        // Validar que el recurso existe
        const [recursoExistente] = await pool.query(
          'SELECT id FROM recursos WHERE id = ? AND activo = TRUE',
          [recurso_id]
        );

        if (recursoExistente.length === 0) {
          return res.status(404).json({
            success: false,
            error: `Recurso con ID ${recurso_id} no existe o está inactivo`
          });
        }

        // Validar que el recurso está asignado al espacio
        const [asignacion] = await pool.query(
          'SELECT cantidad_maxima FROM espacios_recursos WHERE espacio_id = ? AND recurso_id = ?',
          [espacioId, recurso_id]
        );

        if (asignacion.length === 0) {
          return res.status(400).json({
            success: false,
            error: `El recurso no está asignado a este espacio`
          });
        }

        // Validar que no pide más de lo permitido
        if (cantidad_solicitada > asignacion[0].cantidad_maxima) {
          return res.status(400).json({
            success: false,
            error: `Máximo permitido para este recurso: ${asignacion[0].cantidad_maxima}`
          });
        }

        // Insertar o actualizar la solicitud de recurso
        await pool.query(
          `INSERT INTO reservas_recursos (reserva_id, recurso_id, cantidad_solicitada, observaciones)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             cantidad_solicitada = ?,
             observaciones = ?`,
          [reservaId, recurso_id, cantidad_solicitada, observaciones || null, cantidad_solicitada, observaciones || null]
        );
      }

      res.json({
        success: true,
        message: 'Recursos agregados a la reserva correctamente'
      });
    } catch (error) {
      console.error('Error agregando recurso a reserva:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          error: 'Este recurso ya está en la reserva'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * CONTROLADOR: confirmarRecurso
   * Confirma la cantidad de un recurso en una reserva
   * Ruta: PUT /api/reservas/:reservaId/recursos/:recursoId/confirmar
   */
  confirmarRecurso: async (req, res) => {
    try {
      const { reservaId, recursoId } = req.params;
      const { cantidad_confirmada } = req.body;

      // Obtener la solicitud
      const [solicitud] = await pool.query(
        'SELECT cantidad_solicitada FROM reservas_recursos WHERE reserva_id = ? AND recurso_id = ?',
        [reservaId, recursoId]
      );

      if (solicitud.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Recurso no encontrado en esta reserva'
        });
      }

      // Validar que cantidad_confirmada no exceda cantidad_solicitada
      if (cantidad_confirmada > solicitud[0].cantidad_solicitada) {
        return res.status(400).json({
          success: false,
          error: `No puedes confirmar más de lo solicitado (${solicitud[0].cantidad_solicitada})`
        });
      }

      // Actualizar cantidad confirmada
      await pool.query(
        'UPDATE reservas_recursos SET cantidad_confirmada = ? WHERE reserva_id = ? AND recurso_id = ?',
        [cantidad_confirmada, reservaId, recursoId]
      );

      res.json({
        success: true,
        message: 'Recurso confirmado correctamente'
      });
    } catch (error) {
      console.error('Error confirmando recurso:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * CONTROLADOR: quitarRecursoDeReserva
   * Quita un recurso de una reserva
   * Ruta: DELETE /api/reservas/:reservaId/recursos/:recursoId
   */
  quitarRecursoDeReserva: async (req, res) => {
    try {
      const { reservaId, recursoId } = req.params;

      const [result] = await pool.query(
        'DELETE FROM reservas_recursos WHERE reserva_id = ? AND recurso_id = ?',
        [reservaId, recursoId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Recurso no encontrado en la reserva'
        });
      }

      res.json({
        success: true,
        message: 'Recurso quitado de la reserva correctamente'
      });
    } catch (error) {
      console.error('Error quitando recurso de reserva:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
};

module.exports = reservasRecursosController;
