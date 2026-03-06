import React, { useState, useEffect } from 'react';
import { reservasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import moment from 'moment';
import '../styles/TablaGeneralReservas.css';

const TablaGeneralReservas = ({ onVolver, onReservaActualizada }) => {
    const { user } = useAuth();
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState('todas');

    // Cargar reservas al montar el componente
    useEffect(() => {
        cargarReservas();
    }, []);

    const cargarReservas = async () => {
        try {
            setLoading(true);
            const response = await reservasAPI.obtenerTodas();
            setReservas(response.data);
            setError(null);
        } catch (err) {
            console.error('Error cargando reservas:', err);
            setError('Error al cargar las reservas');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar reservas según selección
    const reservasFiltradas = reservas.filter(reserva => {
        if (filtroEstado === 'todas') return true;
        if (filtroEstado === 'mis-reservas') return reserva.creador_id === user.id;
        return reserva.estado === filtroEstado;
    });

    // Permisos
    const puedeCancelar = (reserva) => {
        return user.role === 'admin' || reserva.creador_id === user.id;
    };

    const puedeAprobarRechazar = (reserva) => {
       return user.role === 'admin' && 
       reserva.estado === 'pendiente' && 
       (reserva.requiere_aprobacion === 1 || reserva.requiere_aprobacion === true);
    };

    // Verificar si una reserva es futura (puede ser eliminada)
    const esReservaFutura = (reserva) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaInicio = new Date(reserva.fecha_inicio);
        return fechaInicio > hoy;
    };

    // Verificar si una reserva está eliminada
    const estaEliminada = (reserva) => {
        return reserva.fecha_eliminacion !== null && reserva.fecha_eliminacion !== undefined;
    };

    // Acciones
    const handleCancelar = async (reservaId) => {
        if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;
        
        try {
            await reservasAPI.cancelar(reservaId);
            await cargarReservas(); // Recargar lista

            if (onReservaActualizada) {
                onReservaActualizada();
            }
        } catch (err) {
            console.error('Error cancelando reserva:', err);
            setError('Error al cancelar la reserva');
        }
    };

    const handleAprobar = async (reservaId) => {
        try {
            await reservasAPI.aprobar(reservaId);
            await cargarReservas();

            if (onReservaActualizada) {
                onReservaActualizada();
            }
        } catch (err) {
            console.error('Error aprobando reserva:', err);
            setError('Error al aprobar la reserva');
        }
    };

    const handleRechazar = async (reservaId) => {
        if (!window.confirm('¿Estás seguro de rechazar esta reserva?')) return;
        
        try {
            await reservasAPI.rechazar(reservaId);
            await cargarReservas();

            if (onReservaActualizada) {
                onReservaActualizada();
            }
        } catch (err) {
            console.error('Error rechazando reserva:', err);
            setError('Error al rechazar la reserva');
        }
    };

    const handleEliminar = async (reservaId) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.')) return;
        
        try {
            await reservasAPI.eliminar(reservaId);
            await cargarReservas(); // Recargar lista

            if (onReservaActualizada) {
                onReservaActualizada();
            }
        } catch (err) {
            console.error('Error eliminando reserva:', err);
            setError('Error al eliminar la reserva');
        }
    };

    // Estados para modal de detalles y edición
    const [detalleReserva, setDetalleReserva] = useState(null);
    const [editandoReserva, setEditandoReserva] = useState(null);
    const [formEditada, setFormEditada] = useState({});
    const [recursosEspacio, setRecursosEspacio] = useState([]);
    const [recursosSolicitados, setRecursosSolicitados] = useState([]);

    const handleVerDetalles = (reserva) => {
        setDetalleReserva(reserva);
    };

    const handleEditarReserva = async (reserva) => {
        if (reserva.estado !== 'confirmada' && reserva.estado !== 'pendiente') {
            alert('Solo se pueden editar reservas confirmadas o pendientes');
            return;
        }
        
        // Cargar recursos del espacio
        try {
            const recursosRes = await reservasAPI.obtenerRecursosEspacio(reserva.espacio_id);
            const recursosEspacioData = recursosRes.data || [];
            setRecursosEspacio(recursosEspacioData);
            
            // Enriquecer los recursos solicitados con cantidad_maxima
            const recursosConMaximo = (reserva.recursos || []).map(recursoSolicitado => {
                const recursoEspacio = recursosEspacioData.find(r => r.id === recursoSolicitado.id);
                return {
                    ...recursoSolicitado,
                    cantidad_maxima: recursoEspacio?.cantidad_maxima || recursoSolicitado.cantidad_maxima || 0
                };
            });
            setRecursosSolicitados(recursosConMaximo);
        } catch (err) {
            console.error('Error cargando recursos del espacio:', err);
        }
        setEditandoReserva(reserva);
        // Formatear fechas correctamente para los inputs (YYYY-MM-DD)
        const fechaInicioFormato = reserva.fecha_inicio ? new Date(reserva.fecha_inicio).toISOString().split('T')[0] : '';
        const fechaFinFormato = reserva.fecha_fin ? new Date(reserva.fecha_fin).toISOString().split('T')[0] : '';
        
        setFormEditada({
            fecha_inicio: fechaInicioFormato,
            fecha_fin: fechaFinFormato,
            hora_inicio: reserva.hora_inicio || '',
            hora_fin: reserva.hora_fin || '',
            titulo: reserva.titulo || '',
            descripcion: reserva.descripcion || '',
            motivo: reserva.motivo || 'reunion',
            cantidad_participantes: reserva.cantidad_participantes || 1,
            observaciones: reserva.observaciones || '',
            participantes_email: reserva.participantes_email || '',
            notificar_participantes: reserva.notificar_participantes || false
        });
    };

    const handleGuardarEdicion = async () => {
        try {
            setLoading(true);
            const datosActualizados = {
                ...formEditada,
                recursos_solicitados: recursosSolicitados.map(r => ({
                    recurso_id: r.id,
                    cantidad_solicitada: r.cantidad_solicitada,
                    observaciones: null
                }))
            };
            await reservasAPI.actualizar(editandoReserva.id, datosActualizados);
            await cargarReservas();
            setEditandoReserva(null);
            setFormEditada({});
            setRecursosSolicitados([]);
            setRecursosEspacio([]);
            if (onReservaActualizada) {
                onReservaActualizada();
            }
        } catch (err) {
            console.error('Error actualizando reserva:', err);
            setError('Error al actualizar la reserva');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormEditada(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAgregarRecurso = (recursoId) => {
        const recurso = recursosEspacio.find(r => r.id === parseInt(recursoId));
        if (recurso && !recursosSolicitados.find(r => r.id === recurso.id)) {
            setRecursosSolicitados(prev => [...prev, {
                id: recurso.id,
                nombre: recurso.nombre,
                cantidad_solicitada: 1,
                cantidad_maxima: recurso.cantidad_maxima
            }]);
        }
    };

    const handleQuitarRecurso = (recursoId) => {
        setRecursosSolicitados(prev => prev.filter(r => r.id !== recursoId));
    };

    const handleCambiarCantidadRecurso = (recursoId, cantidad) => {
        setRecursosSolicitados(prev => prev.map(r => 
            r.id === recursoId ? { ...r, cantidad_solicitada: parseInt(cantidad) } : r
        ));
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Cargando reservas...</p>
            </div>
        );
    }

    return (
        <div className="tabla-reservas">
            {/* FILTROS */}
            <div className="filtros-container">
                <div className="filtros-tabs">
                    <button 
                        className={filtroEstado === 'todas' ? 'activo' : ''}
                        onClick={() => setFiltroEstado('todas')}
                    >
                        Todas las Reservas
                    </button>
                    
                    <button 
                        className={filtroEstado === 'mis-reservas' ? 'activo' : ''}
                        onClick={() => setFiltroEstado('mis-reservas')}
                    >
                        Mis Reservas
                    </button>
                    
                    <button 
                        className={filtroEstado === 'pendiente' ? 'activo' : ''}
                        onClick={() => setFiltroEstado('pendiente')}
                    >
                        Pendientes
                    </button>
                    
                    <button 
                        className={filtroEstado === 'confirmada' ? 'activo' : ''}
                        onClick={() => setFiltroEstado('confirmada')}
                    >
                        Confirmadas
                    </button>
                </div>

                <div className="resumen-stats">
                    <span className="stat">
                        Total: <strong>{reservasFiltradas.length}</strong>
                    </span>
                    {user.role === 'admin' && (
                        <span className="stat">
                            Pendientes: <strong>{reservas.filter(r => r.estado === 'pendiente').length}</strong>
                        </span>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* TABLA */}
            <div className="table-container">
                <table className="reservas-table">
                    <thead>
                        <tr>
                            <th>N° Reserva</th>
                            <th>Espacio</th>
                            <th>Fecha</th>
                            <th>Horario</th>
                            <th>Título</th>
                            <th>Estado</th>
                            <th>Solicitante</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservasFiltradas.length > 0 ? (
                            reservasFiltradas.map(reserva => (
                                <tr key={reserva.id} className={`${reserva.creador_id === user.id ? 'mi-reserva' : ''} ${estaEliminada(reserva) ? 'eliminada' : ''}`}>
                                    <td className="numero-reserva">
                                        <strong>{reserva.numero_reserva}</strong>
                                    </td>
                                    <td>
                                        <div className="espacio-info">
                                            <strong>{reserva.espacio_nombre}</strong>
                                            {reserva.cantidad_participantes > 1 && (
                                                <small>{reserva.cantidad_participantes} personas</small>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {moment(reserva.fecha_inicio).format('DD/MM/YYYY')}
                                        {reserva.fecha_inicio !== reserva.fecha_fin && (
                                            <small> al {moment(reserva.fecha_fin).format('DD/MM/YYYY')}</small>
                                        )}
                                    </td>
                                    <td>
                                        {reserva.hora_inicio} - {reserva.hora_fin}
                                    </td>
                                    <td className="titulo">
                                        {reserva.titulo}
                                        {reserva.descripcion && (
                                            <small title={reserva.descripcion}>💬</small>
                                        )}
                                        {reserva.recursos && reserva.recursos.length > 0 && (
                                            <small className="recursos-badge" title={`${reserva.recursos.length} recursos solicitados`}>📦</small>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`estado-badge ${estaEliminada(reserva) ? 'eliminada' : reserva.estado}`}>
                                            {estaEliminada(reserva) ? 'eliminada' : reserva.estado}
                                        </span>
                                    </td>
                                    <td>
                                        {reserva.usuario_nombre}
                                        {reserva.creador_id === user.id && (
                                            <small className="tu-reserva">(Tú)</small>
                                        )}
                                    </td>
                                    <td>
                                        <div className="acciones">
                                            {estaEliminada(reserva) && (
                                                <span className="eliminada-badge" title="Esta reserva ha sido eliminada">🗑️ Eliminada</span>
                                            )}
                                            <button 
                                                className="btn-ver"
                                                onClick={() => handleVerDetalles(reserva)}
                                                title="Ver detalles"
                                            >
                                                👁️
                                            </button>

                                            {(reserva.creador_id === user.id || user.role === 'admin') && (reserva.estado === 'confirmada' || reserva.estado === 'pendiente') && !estaEliminada(reserva) && (
                                                <button 
                                                    className="btn-editar"
                                                    onClick={() => handleEditarReserva(reserva)}
                                                    title="Editar reserva"
                                                >
                                                    ✏️
                                                </button>
                                            )}

                                            {(reserva.creador_id === user.id || user.role === 'admin') && esReservaFutura(reserva) && !estaEliminada(reserva) && (
                                                <button 
                                                    className="btn-eliminar"
                                                    onClick={() => handleEliminar(reserva.id)}
                                                    title="Eliminar reserva"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                            
                                            {puedeCancelar(reserva) && reserva.estado === 'pendiente' && (
                                                <button 
                                                    className="btn-cancelar"
                                                    onClick={() => handleCancelar(reserva.id)}
                                                    title="Cancelar reserva"
                                                >
                                                    ❌
                                                </button>
                                            )}
                                            
                                            {puedeAprobarRechazar(reserva) && (
                                                <>
                                                    <button 
                                                        className="btn-aprobar"
                                                        onClick={() => handleAprobar(reserva.id)}
                                                        title="Aprobar reserva"
                                                    >
                                                        ✅
                                                    </button>
                                                    <button 
                                                        className="btn-rechazar"
                                                        onClick={() => handleRechazar(reserva.id)}
                                                        title="Rechazar reserva"
                                                    >
                                                        🚫
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="sin-reservas">
                                    {filtroEstado === 'mis-reservas' 
                                        ? 'No tienes reservas con este filtro' 
                                        : 'No hay reservas con este filtro'
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE DETALLES */}
            {detalleReserva && (
                <div className="modal-overlay" onClick={() => setDetalleReserva(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📋 Detalles de Reserva</h2>
                            <button onClick={() => setDetalleReserva(null)} className="btn-cerrar">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="detalle-grid">
                                <div className="detalle-item">
                                    <strong>N° Reserva:</strong>
                                    <span>{detalleReserva.numero_reserva}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Espacio:</strong>
                                    <span>{detalleReserva.espacio_nombre}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Fecha Inicio:</strong>
                                    <span>{moment(detalleReserva.fecha_inicio).format('DD/MM/YYYY')}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Hora Inicio:</strong>
                                    <span>{detalleReserva.hora_inicio}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Fecha Fin:</strong>
                                    <span>{moment(detalleReserva.fecha_fin).format('DD/MM/YYYY')}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Hora Fin:</strong>
                                    <span>{detalleReserva.hora_fin}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Título:</strong>
                                    <span>{detalleReserva.titulo || '-'}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Estado:</strong>
                                    <span className={`estado-badge ${detalleReserva.estado}`}>{detalleReserva.estado}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Solicitante:</strong>
                                    <span>{detalleReserva.usuario_nombre}</span>
                                </div>
                                <div className="detalle-item">
                                    <strong>Participantes:</strong>
                                    <span>{detalleReserva.cantidad_participantes || 1}</span>
                                </div>
                            </div>
                            {detalleReserva.descripcion && (
                                <div className="detalle-descripcion">
                                    <strong>Descripción:</strong>
                                    <p>{detalleReserva.descripcion}</p>
                                </div>
                            )}
                            {detalleReserva.recursos && detalleReserva.recursos.length > 0 && (
                                <div className="detalle-recursos">
                                    <strong>📦 Recursos Solicitados:</strong>
                                    <ul>
                                        {detalleReserva.recursos.map((recurso, idx) => (
                                            <li key={idx}>{recurso.nombre} <span className="cantidad">x{recurso.cantidad_solicitada}</span></li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setDetalleReserva(null)} className="btn-cerrar-modal">Cerrar</button>
                    </div>
                </div>
            )}

            {/* MODAL DE EDICIÓN */}
            {editandoReserva && (
                <div className="modal-overlay" onClick={() => setEditandoReserva(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>✏️ Editar Reserva</h2>
                            <button onClick={() => setEditandoReserva(null)} className="btn-cerrar">✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Fecha Inicio</label>
                                <input
                                    type="date"
                                    name="fecha_inicio"
                                    value={formEditada.fecha_inicio}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Hora Inicio</label>
                                <input
                                    type="time"
                                    name="hora_inicio"
                                    value={formEditada.hora_inicio}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha Fin</label>
                                <input
                                    type="date"
                                    name="fecha_fin"
                                    value={formEditada.fecha_fin}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Hora Fin</label>
                                <input
                                    type="time"
                                    name="hora_fin"
                                    value={formEditada.hora_fin}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Título</label>
                                <input
                                    type="text"
                                    name="titulo"
                                    value={formEditada.titulo}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    name="descripcion"
                                    value={formEditada.descripcion}
                                    onChange={handleInputChange}
                                    rows="4"
                                />
                            </div>
                            <div className="form-group">
                                <label>Motivo</label>
                                <select
                                    name="motivo"
                                    value={formEditada.motivo || 'reunion'}
                                    onChange={handleInputChange}
                                >
                                    <option value="clase">Clase</option>
                                    <option value="reunion">Reunión</option>
                                    <option value="evento">Evento</option>
                                    <option value="examen">Examen</option>
                                    <option value="capacitacion">Capacitación</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cantidad de Participantes</label>
                                <input
                                    type="number"
                                    name="cantidad_participantes"
                                    value={formEditada.cantidad_participantes}
                                    onChange={handleInputChange}
                                    min="1"
                                />
                            </div>
                            <div className="form-group">
                                <label>Correos de Participantes (separados por coma)</label>
                                <textarea
                                    name="participantes_email"
                                    value={formEditada.participantes_email}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="usuario1@example.com, usuario2@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="notificar_participantes"
                                        checked={formEditada.notificar_participantes}
                                        onChange={(e) => {
                                            setFormEditada(prev => ({
                                                ...prev,
                                                notificar_participantes: e.target.checked
                                            }));
                                        }}
                                    />
                                    Notificar a participantes
                                </label>
                            </div>
                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea
                                    name="observaciones"
                                    value={formEditada.observaciones}
                                    onChange={handleInputChange}
                                    rows="3"
                                />
                            </div>

                            {/* SECCIÓN DE RECURSOS */}
                            <div className="recursos-edicion-section">
                                <h4>📦 Recursos del Espacio</h4>
                                
                                {recursosEspacio.length > 0 ? (
                                    <>
                                        <div className="recursos-disponibles">
                                            <label>Agregar Recursos</label>
                                            <select 
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleAgregarRecurso(e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                defaultValue=""
                                            >
                                                <option value="">-- Seleccionar recurso --</option>
                                                {recursosEspacio.map(recurso => (
                                                    <option 
                                                        key={recurso.id} 
                                                        value={recurso.id}
                                                        disabled={recursosSolicitados.some(r => r.id === recurso.id)}
                                                    >
                                                        {recurso.nombre} (Máx: {recurso.cantidad_maxima})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {recursosSolicitados.length > 0 && (
                                            <div className="recursos-seleccionados">
                                                <h5>Recursos Seleccionados ({recursosSolicitados.length})</h5>
                                                <div className="recursos-list">
                                                    {recursosSolicitados.map(recurso => (
                                                        <div key={recurso.id} className="recurso-item-edicion">
                                                            <div className="recurso-info">
                                                                <span className="recurso-nombre">{recurso.nombre}</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={recurso.cantidad_maxima}
                                                                    value={recurso.cantidad_solicitada}
                                                                    onChange={(e) => handleCambiarCantidadRecurso(recurso.id, e.target.value)}
                                                                    className="cantidad-input"
                                                                />
                                                                <span className="cantidad-max">/ {recurso.cantidad_maxima}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuitarRecurso(recurso.id)}
                                                                className="btn-quitar-recurso"
                                                                title="Quitar recurso"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="sin-recursos">Este espacio no tiene recursos disponibles</p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                onClick={handleGuardarEdicion} 
                                className="btn-guardar"
                            >
                                💾 Guardar Cambios
                            </button>
                            <button 
                                onClick={() => setEditandoReserva(null)} 
                                className="btn-cancelar"
                            >
                                ✕ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TablaGeneralReservas;