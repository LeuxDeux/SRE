import React, { useState, useEffect } from 'react';
import { espaciosAPI, espaciosRecursosAPI, reservasAPI, reservasRecursosAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import moment from 'moment';
import '../styles/ReservaForm.css';

const ReservaForm = ({ slotInicial, onClose, onReservaCreada }) => {
    const { user } = useAuth();
    const [espacios, setEspacios] = useState([]);
    const [recursosDelEspacio, setRecursosDelEspacio] = useState([]);
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
            const espaciosRes = await espaciosAPI.obtenerTodos();
            setEspacios(espaciosRes.data);
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('Error al cargar los espacios');
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

    const validarDisponibilidad = async () => {
        if (!formData.espacio_id || !formData.fecha_inicio || !formData.hora_inicio || 
            !formData.fecha_fin || !formData.hora_fin) {
            setError('Completa todos los campos de fecha y espacio para validar disponibilidad');
            return;
        }

        try {
            setValidando(true);
            
            // Validar disponibilidad del espacio
            const response = await reservasAPI.validarDisponibilidad({
                espacio_id: formData.espacio_id,
                fecha_inicio: formData.fecha_inicio,
                hora_inicio: formData.hora_inicio,
                fecha_fin: formData.fecha_fin,
                hora_fin: formData.hora_fin
            });

            setDisponibilidad(response.data);
            
            if (response.data.disponible) {
                // Cargar recursos del espacio seleccionado
                const recursosRes = await espaciosRecursosAPI.obtenerRecursosDeEspacio(formData.espacio_id);
                const recursosData = recursosRes.data || recursosRes || [];
                setRecursosDelEspacio(recursosData);
                
                setError(null);
                setPasoActual(2); // Ir al paso de recursos
            } else {
                setError('El espacio no está disponible en ese horario');
            }
        } catch (err) {
            console.error('Error validando disponibilidad:', err);
            setError('Error al validar disponibilidad');
        } finally {
            setValidando(false);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const reservaData = {
                espacio_id: formData.espacio_id,
                fecha_inicio: formData.fecha_inicio,
                hora_inicio: formData.hora_inicio,
                fecha_fin: formData.fecha_fin,
                hora_fin: formData.hora_fin,
                titulo: formData.titulo,
                descripcion: formData.descripcion,
                motivo: formData.motivo,
                cantidad_participantes: formData.cantidad_participantes,
                usuario_id: user.id
            };

            // Crear la reserva
            const response = await reservasAPI.crear(reservaData);
            
            if (response.data.success) {
                const reservaId = response.data.reserva.id;
                
                // Agregar recursos si hay algunos seleccionados
                if (formData.recursos_solicitados.length > 0) {
                    await reservasRecursosAPI.agregarRecursoAReserva(
                        reservaId, 
                        formData.recursos_solicitados
                    );
                }
                
                onReservaCreada(response.data.reserva);
            }
        } catch (err) {
            console.error('Error creando reserva:', err);
            setError(err.response?.data?.error || 'Error al crear la reserva');
        } finally {
            setLoading(false);
        }
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

                    {/* PASO 2: RECURSOS */}
                    {pasoActual === 2 && (
                        <div className="paso-container">
                            <h3>🎛️ Recursos Adicionales (Opcional)</h3>
                            <p className="subtitulo-paso">
                                Selecciona los recursos disponibles en {espacios.find(e => e.id === parseInt(formData.espacio_id))?.nombre}
                            </p>

                            {recursosDelEspacio.length > 0 ? (
                                <div className="recursos-lista">
                                    {recursosDelEspacio.map(recurso => {
                                        const recursoSeleccionado = formData.recursos_solicitados.find(r => r.recurso_id === recurso.recurso_id);
                                        const cantidadSolicitada = recursoSeleccionado?.cantidad_solicitada || 0;

                                        return (
                                            <div key={recurso.id} className="recurso-item">
                                                <div className="recurso-info">
                                                    <strong>{recurso.nombre}</strong>
                                                    <span>Máximo disponible: {recurso.cantidad_maxima}</span>
                                                    {recurso.descripcion && (
                                                        <small>{recurso.descripcion}</small>
                                                    )}
                                                </div>
                                                <div className="recurso-cantidad">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={recurso.cantidad_maxima}
                                                        value={cantidadSolicitada}
                                                        onChange={(e) => handleRecursoChange(recurso.recurso_id, parseInt(e.target.value) || 0)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="sin-datos">
                                    Este espacio no tiene recursos asignados.
                                </div>
                            )}

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
                                        <strong>Recursos Solicitados:</strong>
                                        <div className="recursos-confirmacion">
                                            {formData.recursos_solicitados.map((recurso) => {
                                                const recursoInfo = recursosDelEspacio.find(r => r.recurso_id === recurso.recurso_id);
                                                return (
                                                    <div key={recurso.recurso_id}>
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