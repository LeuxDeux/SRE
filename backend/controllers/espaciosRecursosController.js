// backend/controllers/espaciosRecursosController.js
const db = require('../config/database');

const espaciosRecursosController = {
    // Asignar recurso a espacio
    asignar: async (req, res) => {
        try {
            const { espacioId } = req.params;
            const { recursos } = req.body; // Array de {recurso_id, cantidad_maxima}

            // Validar que el espacio existe
            const [espacio] = await db.execute('SELECT id FROM espacios WHERE id = ?', [espacioId]);
            if (espacio.length === 0) {
                return res.status(404).json({ error: 'Espacio no encontrado' });
            }

            for (const recurso of recursos) {
                // Validar que el recurso existe
                const [recursoExistente] = await db.execute('SELECT id, cantidad_total FROM recursos WHERE id = ?', [recurso.recurso_id]);
                if (recursoExistente.length === 0) {
                    return res.status(404).json({ error: `Recurso con ID ${recurso.recurso_id} no encontrado` });
                }

                // Validar que no excede el stock total
                if (recurso.cantidad_maxima > recursoExistente[0].cantidad_total) {
                    return res.status(400).json({ 
                        error: `La cantidad máxima (${recurso.cantidad_maxima}) excede el stock total (${recursoExistente[0].cantidad_total})` 
                    });
                }

                // Insertar o actualizar la asignación
                await db.execute(
                    `INSERT INTO espacios_recursos (espacio_id, recurso_id, cantidad_maxima) 
                     VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE cantidad_maxima = ?`,
                    [espacioId, recurso.recurso_id, recurso.cantidad_maxima, recurso.cantidad_maxima]
                );
            }
            
            res.json({ 
                success: true,
                message: 'Recursos asignados correctamente'
            });
        } catch (error) {
            console.error('Error asignando recursos:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'El recurso ya está asignado a este espacio' });
            }
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Quitar recurso de espacio
    quitar: async (req, res) => {
        try {
            const { espacioId, recursoId } = req.params;
            
            const [result] = await db.execute(
                'DELETE FROM espacios_recursos WHERE espacio_id = ? AND recurso_id = ?',
                [espacioId, recursoId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Asignación no encontrada' });
            }

            res.json({ 
                success: true,
                message: 'Recurso quitado del espacio correctamente'
            });
        } catch (error) {
            console.error('Error quitando recurso:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Obtener recursos asignados a un espacio
    obtenerRecursosDeEspacio: async (req, res) => {
        try {
            const { espacioId } = req.params;
            
            const [recursos] = await db.execute(
                `SELECT 
                    er.id,
                    er.recurso_id,
                    er.cantidad_maxima,
                    r.nombre,
                    r.descripcion,
                    r.cantidad_total,
                    r.activo
                 FROM espacios_recursos er
                 JOIN recursos r ON er.recurso_id = r.id
                 WHERE er.espacio_id = ? AND er.disponible = TRUE AND r.activo = TRUE
                 ORDER BY r.nombre`,
                [espacioId]
            );
            
            res.json(recursos);
        } catch (error) {
            console.error('Error obteniendo recursos del espacio:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Obtener todos los recursos asignados (para admin)
    obtenerTodasLasAsignaciones: async (req, res) => {
        try {
            const [asignaciones] = await db.execute(
                `SELECT 
                    er.*,
                    e.nombre as espacio_nombre,
                    r.nombre as recurso_nombre,
                    r.cantidad_total
                 FROM espacios_recursos er
                 JOIN espacios e ON er.espacio_id = e.id
                 JOIN recursos r ON er.recurso_id = r.id
                 ORDER BY e.nombre, r.nombre`
            );
            
            res.json(asignaciones);
        } catch (error) {
            console.error('Error obteniendo asignaciones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = espaciosRecursosController;