import React, { useState, useEffect, useCallback } from 'react';
import { recursosAPI } from '../services/api';
import '../styles/GestionRecursos.css';

const GestionRecursos = ({ onVolver }) => {
    const [recursos, setRecursos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [recursoEditando, setRecursoEditando] = useState(null);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        cantidad_total: 1
    });

    // Cargar recursos al montar el componente
    const cargarRecursos = useCallback(async () => {
        try {
            setLoading(true);
            const response = mostrarInactivos 
                ? await recursosAPI.obtenerTodosConInactivos()
                : await recursosAPI.obtenerTodos();
            setRecursos(response.data);
            setError(null);
        } catch (err) {
            console.error('Error cargando recursos:', err);
            setError('Error al cargar los recursos');
        } finally {
            setLoading(false);
        }
    }, [mostrarInactivos]);

    useEffect(() => {
        cargarRecursos();
    }, [cargarRecursos]);

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) || 1 : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (recursoEditando) {
                // Editar recurso existente
                await recursosAPI.actualizar(recursoEditando.id, formData);
            } else {
                // Crear nuevo recurso
                await recursosAPI.crear(formData);
            }
            
            // Recargar lista y resetear form
            await cargarRecursos();
            resetForm();
            
        } catch (err) {
            console.error('Error guardando recurso:', err);
            setError(err.response?.data?.error || 'Error al guardar el recurso');
        }
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            descripcion: '',
            cantidad_total: 1
        });
        setRecursoEditando(null);
        setMostrarFormulario(false);
    };

    const handleEditar = (recurso) => {
        setRecursoEditando(recurso);
        setFormData({
            nombre: recurso.nombre,
            descripcion: recurso.descripcion || '',
            cantidad_total: recurso.cantidad_total
        });
        setMostrarFormulario(true);
    };

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este recurso?\n\nNota: Esto también lo quitará de todos los espacios donde esté asignado.')) {
            return;
        }

        try {
            await recursosAPI.eliminar(id);
            await cargarRecursos();
        } catch (err) {
            console.error('Error eliminando recurso:', err);
            setError(err.response?.data?.error || 'Error al eliminar el recurso');
        }
    };

    const toggleActivo = async (recurso) => {
        try {
            await recursosAPI.actualizar(recurso.id, {
                ...recurso,
                activo: !recurso.activo
            });
            await cargarRecursos();
        } catch (err) {
            console.error('Error cambiando estado del recurso:', err);
            setError('Error al cambiar el estado del recurso');
        }
    };

    if (loading) {
        return <div className="loading">Cargando recursos...</div>;
    }

    return (
        <div className="gestion-recursos">
            {/* Botón volver si viene por prop */}
            {onVolver && (
                <div className="modulo-header">
                    <button onClick={onVolver} className="btn-volver">
                        ← Volver al Calendario
                    </button>
                </div>
            )}
            
            <div className="header">
                <h2>🎛️ Gestión de Recursos</h2>
                <div className="header-buttons">
                    <button 
                        onClick={() => setMostrarInactivos(!mostrarInactivos)}
                        className={`btn-filtro ${mostrarInactivos ? 'activo' : ''}`}
                        title={mostrarInactivos ? 'Ocultando inactivos' : 'Mostrando solo activos'}
                    >
                        {mostrarInactivos ? '👁️ Mostrando Inactivos' : '🔍 Mostrar Inactivos'}
                    </button>
                    <button 
                        onClick={() => setMostrarFormulario(true)}
                        className="btn-nuevo"
                    >
                        ➕ Nuevo Recurso
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* FORMULARIO */}
            {mostrarFormulario && (
                <div className="formulario-container">
                    <h3>{recursoEditando ? 'Editar Recurso' : 'Nuevo Recurso'}</h3>
                    
                    <form onSubmit={handleSubmit} className="recurso-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre del Recurso *</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    placeholder="Ej: Micrófono Inalámbrico, Proyector HD"
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Stock Total *</label>
                                <input
                                    type="number"
                                    name="cantidad_total"
                                    value={formData.cantidad_total}
                                    onChange={handleInputChange}
                                    min="1"
                                    required
                                />
                                <small>Cantidad total disponible en la universidad</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleInputChange}
                                rows="3"
                                placeholder="Describa las características, marca, modelo, condiciones de uso..."
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-guardar">
                                {recursoEditando ? 'Actualizar' : 'Crear'} Recurso
                            </button>
                            <button 
                                type="button" 
                                onClick={resetForm}
                                className="btn-cancelar"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TABLA DE RECURSOS */}
            <div className="recursos-table-container">
                <table className="recursos-table">
                    <thead>
                        <tr>
                            <th>Recurso</th>
                            <th>Stock Total</th>
                            <th>Descripción</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recursos.map(recurso => (
                            <tr key={recurso.id} className={`recurso-fila ${!recurso.activo ? 'inactivo' : ''}`}>
                                <td>
                                    <strong>{recurso.nombre}</strong>
                                </td>
                                <td>
                                    <span className="cantidad-total">
                                        {recurso.cantidad_total} unidades
                                    </span>
                                </td>
                                <td>
                                    {recurso.descripcion ? (
                                        <div className="descripcion">{recurso.descripcion}</div>
                                    ) : (
                                        <span className="sin-descripcion">Sin descripción</span>
                                    )}
                                </td>
                                <td>
                                    <button 
                                        onClick={() => toggleActivo(recurso)}
                                        className={`btn-estado ${recurso.activo ? 'activo' : 'inactivo'}`}
                                    >
                                        {recurso.activo ? '🟢 Activo' : '🔴 Inactivo'}
                                    </button>
                                </td>
                                <td>
                                    <button 
                                        onClick={() => handleEditar(recurso)}
                                        className="btn-editar"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button 
                                        onClick={() => handleEliminar(recurso.id)}
                                        className="btn-eliminar"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {recursos.length === 0 && (
                    <div className="sin-recursos">
                        <p>No hay recursos creados aún.</p>
                        <button 
                            onClick={() => setMostrarFormulario(true)}
                            className="btn-nuevo"
                        >
                            ➕ Crear Primer Recurso
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GestionRecursos;