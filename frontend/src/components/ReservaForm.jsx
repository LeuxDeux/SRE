import React, { useState, useEffect } from 'react';
import { espaciosAPI, recursosAPI, reservasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import moment from 'moment';
import '../styles/ReservaForm.css';

const ReservaForm = ({ slotInicial, onClose, onReservaCreada }) => {
    const { user } = useAuth();
    const [espacios, setEspacios] = useState([]);
    const [recursos, setRecursos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pasoActual, setPasoActual] = useState(1);
    const [disponibilidad, setDisponibilidad] = useState(null);
    const [validando, setValidando] = useState(false);

    const [formData, setFormData] = useState({
        espacio_id: '',
        fecha_inicio: slotInicial ? moment(slotInicial.start).format('YYYY-MM-DD') : '',
        hora_inicio: slotInicial ? moment(slotInicial.start).format('HH:mm') : '',
        fecha_fin: slotInicial ? moment(slotInicial.end).format('YYYY-MM-DD') : '',
        hora_fin: slotInicial ? moment(slotInicial.end).format('HH:mm') : '',
        titulo: '',
        descripcion: '',
        motivo: 'reunion',
        cantidad_participantes: 1,
        recursos_solicitados: []
    });

    // Cargar espacios y recursos al abrir el modal
    useEffect(() => {
        cargarDatos();
    }, []);

    // Si hay slot inicial, pre-seleccionar fechas
    useEffect(() => {
        if (slotInicial) {
            setFormData(prev => ({
                ...prev,
                fecha_inicio: moment(slotInicial.start).format('YYYY-MM-DD'),
                hora_inicio: moment(slotInicial.start).format('HH:mm'),
                fecha_fin: moment(slotInicial.end).format('YYYY-MM-DD'),
                hora_fin: moment(slotInicial.end).format('HH:mm')
            }));
        }
    }, [slotInicial]);

    const cargarDatos = async () => {
        try {
            const [espaciosRes, recursosRes] = await Promise.all([
                espaciosAPI.obtenerTodos(),
                recursosAPI.obtenerTodos()
            ]);
            setEspacios(espaciosRes.data);
            setRecursos(recursosRes.data);
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('Error al cargar los datos');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) || 1 : value
        }));

        // Si cambia espacio o fechas, resetear validación
        if (['espacio_id', 'fecha_inicio', 'hora_inicio', 'fecha_fin', 'hora_fin'].includes(name)) {
            setDisponibilidad(null);
        }
    };

    const handleRecursoChange = (recursoId, cantidad) => {
        setFormData(prev => {
            const recursosExistentes = prev.recursos_solicitados.filter(r => r.recurso_id !== recursoId);
            
            if (cantidad > 0) {
                return {
                    ...prev,
                    recursos_solicitados: [
                        ...recursosExistentes,
                        { recurso_id: recursoId, cantidad_solicitada: cantidad }
                    ]
                };
            } else {
                return {
                    ...prev,
                    recursos_solicitados: recursosExistentes
                };
            }
        });
    };

    const validarDisponibilidad = async () => {
        if (!formData.espacio_id || !formData.fecha_inicio || !formData.hora_inicio || 
            !formData.fecha_fin || !formData.hora_fin) {
            setError('Completa todos los campos de fecha y espacio para validar disponibilidad');
            return;
        }

        try {
            setValidando(true);
            const response = await reservasAPI.validarDisponibilidad({
                espacio_id: formData.espacio_id,
                fecha_inicio: formData.fecha_inicio,
                hora_inicio: formData.hora_inicio,
                fecha_fin: formData.fecha_fin,
                hora_fin: formData.hora_fin
            });

            setDisponibilidad(response.data);
            if (response.data.disponible) {
                setError(null);
                setPasoActual(2); // Avanzar al siguiente paso
            }
        } catch (err) {
            console.error('Error validando disponibilidad:', err);
            setError('Error al validar disponibilidad');
        } finally {
            setValidando(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const reservaData = {
                ...formData,
                usuario_id: user.id
            };

            const response = await reservasAPI.crear(reservaData);
            
            if (response.data.success) {
                onReservaCreada(response.data.reserva);
            }
        } catch (err) {
            console.error('Error creando reserva:', err);
            setError(err.response?.data?.error || 'Error al crear la reserva');
        } finally {
            setLoading(false);
        }
    };

    const getRecursosDelEspacio = () => {
        if (!formData.espacio_id) return [];
        const espacio = espacios.find(e => e.id === parseInt(formData.espacio_id));
        // Aquí necesito un endpoint para obtener recursos del espacio
        return recursos; // Por ahora devolver todos
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* HEADER DEL MODAL */}
                <div className="modal-header">
                    <h2>🏢 Nueva Reserva</h2>
                    <button className="btn-cerrar" onClick={onClose}>×</button>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {/* PROGRESO */}
                <div className="progreso-pasos">
                    <div className={`paso ${pasoActual >= 1 ? 'activo' : ''}`}>
                        <span>1</span>
                        <label>Datos Básicos</label>
                    </div>
                    <div className={`paso ${pasoActual >= 2 ? 'activo' : ''}`}>
                        <span>2</span>
                        <label>Recursos</label>
                    </div>
                    <div className={`paso ${pasoActual >= 3 ? 'activo' : ''}`}>
                        <span>3</span>
                        <label>Confirmar</label>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="reserva-form">
                    {/* PASO 1: DATOS BÁSICOS */}
                    {pasoActual === 1 && (
                        <div className="paso-container">
                            <h3>📅 Datos de la Reserva</h3>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Espacio *</label>
                                    <select
                                        name="espacio_id"
                                        value={formData.espacio_id}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Seleccionar espacio</option>
                                        {espacios.filter(e => e.estado === 'disponible').map(espacio => (
                                            <option key={espacio.id} value={espacio.id}>
                                                {espacio.nombre} - Capacidad: {espacio.capacidad || 'N/A'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fecha Inicio *</label>
                                    <input
                                        type="date"
                                        name="fecha_inicio"
                                        value={formData.fecha_inicio}
                                        onChange={handleInputChange}
                                        min={moment().format('YYYY-MM-DD')}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Hora Inicio *</label>
                                    <input
                                        type="time"
                                        name="hora_inicio"
                                        value={formData.hora_inicio}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fecha Fin *</label>
                                    <input
                                        type="date"
                                        name="fecha_fin"
                                        value={formData.fecha_fin}
                                        onChange={handleInputChange}
                                        min={formData.fecha_inicio}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Hora Fin *</label>
                                    <input
                                        type="time"
                                        name="hora_fin"
                                        value={formData.hora_fin}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Título *</label>
                                    <input
                                        type="text"
                                        name="titulo"
                                        value={formData.titulo}
                                        onChange={handleInputChange}
                                        placeholder="Ej: Reunión de equipo, Clase de matemáticas..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Describe el propósito de la reserva..."
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Motivo</label>
                                    <select
                                        name="motivo"
                                        value={formData.motivo}
                                        onChange={handleInputChange}
                                    >
                                        <option value="reunion">Reunión</option>
                                        <option value="clase">Clase</option>
                                        <option value="evento">Evento</option>
                                        <option value="examen">Examen</option>
                                        <option value="capacitacion">Capacitación</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Participantes</label>
                                    <input
                                        type="number"
                                        name="cantidad_participantes"
                                        value={formData.cantidad_participantes}
                                        onChange={handleInputChange}
                                        min="1"
                                    />
                                </div>
                            </div>

                            {/* VALIDACIÓN DE DISPONIBILIDAD */}
                            {disponibilidad && (
                                <div className={`disponibilidad ${disponibilidad.disponible ? 'disponible' : 'no-disponible'}`}>
                                    {disponibilidad.disponible ? (
                                        <div className="disponible-message">
                                            ✅ El espacio está disponible en ese horario
                                        </div>
                                    ) : (
                                        <div className="no-disponible-message">
                                            ❌ El espacio no está disponible. Conflictos encontrados:
                                            <ul>
                                                {disponibilidad.conflictos.map((conflicto, index) => (
                                                    <li key={index}>
                                                        {conflicto.titulo} - {conflicto.fecha_inicio} {conflicto.hora_inicio}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={onClose}
                                    className="btn-cancelar"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="button"
                                    onClick={validarDisponibilidad}
                                    disabled={validando}
                                    className="btn-siguiente"
                                >
                                    {validando ? 'Validando...' : 'Siguiente →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 2: RECURSOS (OPCIONAL) */}
                    {pasoActual === 2 && (
                        <div className="paso-container">
                            <h3>🎛️ Recursos Adicionales (Opcional)</h3>
                            <p className="subtitulo-paso">
                                Selecciona los recursos que necesitas para tu reserva
                            </p>

                            <div className="recursos-lista">
                                {recursos.map(recurso => (
                                    <div key={recurso.id} className="recurso-item">
                                        <div className="recurso-info">
                                            <strong>{recurso.nombre}</strong>
                                            <span>Stock disponible: {recurso.cantidad_total}</span>
                                            {recurso.descripcion && (
                                                <small>{recurso.descripcion}</small>
                                            )}
                                        </div>
                                        <div className="recurso-cantidad">
                                            <input
                                                type="number"
                                                min="0"
                                                max={recurso.cantidad_total}
                                                value={formData.recursos_solicitados.find(r => r.recurso_id === recurso.id)?.cantidad_solicitada || 0}
                                                onChange={(e) => handleRecursoChange(recurso.id, parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={() => setPasoActual(1)}
                                    className="btn-anterior"
                                >
                                    ← Anterior
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPasoActual(3)}
                                    className="btn-siguiente"
                                >
                                    Siguiente →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: CONFIRMACIÓN */}
                    {pasoActual === 3 && (
                        <div className="paso-container">
                            <h3>✅ Confirmar Reserva</h3>
                            
                            <div className="resumen-reserva">
                                <div className="resumen-item">
                                    <strong>Espacio:</strong>
                                    <span>{espacios.find(e => e.id === parseInt(formData.espacio_id))?.nombre}</span>
                                </div>
                                <div className="resumen-item">
                                    <strong>Fecha y Hora:</strong>
                                    <span>{formData.fecha_inicio} {formData.hora_inicio} - {formData.fecha_fin} {formData.hora_fin}</span>
                                </div>
                                <div className="resumen-item">
                                    <strong>Título:</strong>
                                    <span>{formData.titulo}</span>
                                </div>
                                <div className="resumen-item">
                                    <strong>Motivo:</strong>
                                    <span>{formData.motivo}</span>
                                </div>
                                {formData.recursos_solicitados.length > 0 && (
                                    <div className="resumen-item">
                                        <strong>Recursos:</strong>
                                        <div>
                                            {formData.recursos_solicitados.map((recurso, index) => {
                                                const recursoInfo = recursos.find(r => r.id === recurso.recurso_id);
                                                return (
                                                    <div key={index}>
                                                        {recursoInfo?.nombre} - {recurso.cantidad_solicitada} unidades
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={() => setPasoActual(2)}
                                    className="btn-anterior"
                                >
                                    ← Anterior
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="btn-confirmar"
                                >
                                    {loading ? 'Creando reserva...' : '✅ Confirmar Reserva'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ReservaForm;