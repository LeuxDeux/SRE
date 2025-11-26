import React, { useState, useEffect } from 'react';
import { espaciosAPI, recursosAPI, espaciosRecursosAPI } from '../services/api';
import '../styles/AsignarRecursos.css';

const AsignarRecursos = ({ onVolver }) => {
    const [espacios, setEspacios] = useState([]);
    const [recursos, setRecursos] = useState([]);
    const [asignaciones, setAsignaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [espacioSeleccionado, setEspacioSeleccionado] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [formData, setFormData] = useState({
        recurso_id: '',
        cantidad_maxima: 1
    });

    // Cargar datos al montar el componente
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [espaciosRes, recursosRes, asignacionesRes] = await Promise.all([
                espaciosAPI.obtenerTodos(),
                recursosAPI.obtenerTodos(),
                espaciosRecursosAPI.obtenerTodasLasAsignaciones()
            ]);
            
            setEspacios(espaciosRes.data);
            setRecursos(recursosRes.data);
            setAsignaciones(asignacionesRes.data);
            setError(null);
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const handleSeleccionarEspacio = (espacio) => {
        setEspacioSeleccionado(espacio);
        setMostrarFormulario(false);
        setFormData({ recurso_id: '', cantidad_maxima: 1 });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'cantidad_maxima' ? parseInt(value) || 1 : value
        }));
    };

    const handleAsignarRecurso = async (e) => {
        e.preventDefault();
        try {
            if (!espacioSeleccionado) {
                setError('Primero selecciona un espacio');
                return;
            }

            await espaciosRecursosAPI.asignar(espacioSeleccionado.id, [formData]);
            
            // Recargar asignaciones
            const asignacionesRes = await espaciosRecursosAPI.obtenerTodasLasAsignaciones();
            setAsignaciones(asignacionesRes.data);
            
            setFormData({ recurso_id: '', cantidad_maxima: 1 });
            setError(null);
            
        } catch (err) {
            console.error('Error asignando recurso:', err);
            setError(err.response?.data?.error || 'Error al asignar el recurso');
        }
    };

    const handleQuitarRecurso = async (asignacionId, espacioId, recursoId) => {
        if (!window.confirm('¿Estás seguro de quitar este recurso del espacio?')) {
            return;
        }

        try {
            await espaciosRecursosAPI.quitar(espacioId, recursoId);
            
            // Recargar asignaciones
            const asignacionesRes = await espaciosRecursosAPI.obtenerTodasLasAsignaciones();
            setAsignaciones(asignacionesRes.data);
            
        } catch (err) {
            console.error('Error quitando recurso:', err);
            setError('Error al quitar el recurso del espacio');
        }
    };

    const getRecursosDelEspacio = (espacioId) => {
        return asignaciones.filter(a => a.espacio_id === espacioId);
    };

    const getRecursosDisponibles = () => {
        if (!espacioSeleccionado) return recursos;
        
        const recursosAsignados = getRecursosDelEspacio(espacioSeleccionado.id);
        const idsAsignados = recursosAsignados.map(a => a.recurso_id);
        
        return recursos.filter(r => !idsAsignados.includes(r.id));
    };

    const getRecursoInfo = (recursoId) => {
        return recursos.find(r => r.id === recursoId);
    };

    if (loading) {
        return <div className="loading">Cargando datos...</div>;
    }

    return (
        <div className="asignar-recursos">
            {onVolver && (
                <div className="modulo-header">
                    <button onClick={onVolver} className="btn-volver">
                        ← Volver al Calendario
                    </button>
                </div>
            )}
            
            <div className="header">
                <h2>🔗 Asignar Recursos a Espacios</h2>
                <p className="subtitle">
                    Gestiona qué recursos están disponibles en cada espacio y en qué cantidad máxima
                </p>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="asignacion-container">
                {/* PANEL IZQUIERDO - LISTA DE ESPACIOS */}
                <div className="espacios-panel">
                    <h3>🏢 Espacios</h3>
                    <div className="espacios-list">
                        {espacios.map(espacio => (
                            <div 
                                key={espacio.id}
                                className={`espacio-item ${espacioSeleccionado?.id === espacio.id ? 'seleccionado' : ''}`}
                                onClick={() => handleSeleccionarEspacio(espacio)}
                            >
                                <div className="espacio-info">
                                    <strong>{espacio.nombre}</strong>
                                    <span>{espacio.ubicacion || 'Sin ubicación'}</span>
                                    <small>
                                        {getRecursosDelEspacio(espacio.id).length} recursos asignados
                                    </small>
                                </div>
                                <div className={`estado ${espacio.estado}`}>
                                    {espacio.estado}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PANEL DERECHO - GESTIÓN DE RECURSOS DEL ESPACIO SELECCIONADO */}
                <div className="recursos-panel">
                    {espacioSeleccionado ? (
                        <>
                            <div className="panel-header">
                                <h3>🎛️ Recursos de {espacioSeleccionado.nombre}</h3>
                                <button 
                                    onClick={() => setMostrarFormulario(!mostrarFormulario)}
                                    className="btn-nuevo"
                                >
                                    {mostrarFormulario ? '❌ Cancelar' : '➕ Agregar Recurso'}
                                </button>
                            </div>

                            {/* FORMULARIO PARA AGREGAR RECURSO */}
                            {mostrarFormulario && (
                                <div className="formulario-asignacion">
                                    <h4>Agregar Nuevo Recurso</h4>
                                    <form onSubmit={handleAsignarRecurso}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Recurso Disponible</label>
                                                <select
                                                    name="recurso_id"
                                                    value={formData.recurso_id}
                                                    onChange={handleInputChange}
                                                    required
                                                >
                                                    <option value="">Seleccionar recurso</option>
                                                    {getRecursosDisponibles().map(recurso => (
                                                        <option key={recurso.id} value={recurso.id}>
                                                            {recurso.nombre} (Stock: {recurso.cantidad_total})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            
                                            <div className="form-group">
                                                <label>Cantidad Máxima</label>
                                                <input
                                                    type="number"
                                                    name="cantidad_maxima"
                                                    value={formData.cantidad_maxima}
                                                    onChange={handleInputChange}
                                                    min="1"
                                                    max={
                                                        recursos.find(r => r.id === parseInt(formData.recurso_id))?.cantidad_total || 1
                                                    }
                                                    required
                                                />
                                                <small>
                                                    Máximo: {
                                                        recursos.find(r => r.id === parseInt(formData.recurso_id))?.cantidad_total || 0
                                                    } unidades disponibles
                                                </small>
                                            </div>
                                        </div>
                                        
                                        <div className="form-actions">
                                            <button type="submit" className="btn-guardar">
                                                ➕ Asignar Recurso
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* LISTA DE RECURSOS ASIGNADOS */}
                            <div className="recursos-asignados">
                                <h4>Recursos Asignados</h4>
                                {getRecursosDelEspacio(espacioSeleccionado.id).length > 0 ? (
                                    <div className="recursos-list">
                                        {getRecursosDelEspacio(espacioSeleccionado.id).map(asignacion => {
                                            const recurso = getRecursoInfo(asignacion.recurso_id);
                                            return (
                                                <div key={asignacion.id} className="recurso-asignado">
                                                    <div className="recurso-info">
                                                        <strong>{recurso?.nombre}</strong>
                                                        <div className="detalles">
                                                            <span>Cantidad máxima: {asignacion.cantidad_maxima}</span>
                                                            <span>Stock total: {recurso?.cantidad_total}</span>
                                                            {recurso?.descripcion && (
                                                                <small>{recurso.descripcion}</small>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleQuitarRecurso(asignacion.id, espacioSeleccionado.id, asignacion.recurso_id)}
                                                        className="btn-eliminar"
                                                    >
                                                        🗑️ Quitar
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="sin-recursos">
                                        <p>No hay recursos asignados a este espacio.</p>
                                        <button 
                                            onClick={() => setMostrarFormulario(true)}
                                            className="btn-nuevo"
                                        >
                                            ➕ Agregar Primer Recurso
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="seleccionar-espacio">
                            <div className="placeholder">
                                <h3>👆 Selecciona un espacio</h3>
                                <p>Elige un espacio de la lista para gestionar sus recursos</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RESUMEN GENERAL */}
            <div className="resumen-general">
                <h3>📊 Resumen de Asignaciones</h3>
                <div className="resumen-stats">
                    <div className="stat-card">
                        <span className="stat-number">{espacios.length}</span>
                        <span className="stat-label">Espacios</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">{recursos.length}</span>
                        <span className="stat-label">Recursos</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-number">{asignaciones.length}</span>
                        <span className="stat-label">Asignaciones</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsignarRecursos;