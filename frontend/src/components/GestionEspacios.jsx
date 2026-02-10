import React, { useState, useEffect } from 'react';
import { espaciosAPI, recursosAPI, espaciosRecursosAPI } from '../services/api';
import EspacioDetail from './EspacioDetail';
import '../styles/GestionEspacios.css';

const GestionEspacios = ({ onVolver }) => {
    const [espacios, setEspacios] = useState([]);
    const [recursos, setRecursos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [espacioEditando, setEspacioEditando] = useState(null);
    const [mostrarRecursos, setMostrarRecursos] = useState(null); // ID del espacio cuyos recursos se muestran
    const [recursosDelEspacio, setRecursosDelEspacio] = useState([]);
    const [asignandoRecursos, setAsignandoRecursos] = useState(null); // ID del espacio al que se asignan recursos
    const [mostrarDetalles, setMostrarDetalles] = useState(null); // ID del espacio cuyos detalles se muestran

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        capacidad: '',
        ubicacion: '',
        estado: 'disponible',
        requiere_aprobacion: true,
        max_horas_por_reserva: 8,
        imagen_url: ''
    });

    const [recursoAsignacion, setRecursoAsignacion] = useState({
        recurso_id: '',
        cantidad_maxima: 1
    });

    // Cargar espacios y recursos al montar el componente
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [espaciosRes, recursosRes] = await Promise.all([
                espaciosAPI.obtenerTodos(),
                recursosAPI.obtenerTodos()
            ]);
            setEspacios(espaciosRes.data);
            setRecursos(recursosRes.data);
            setError(null);
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const cargarRecursosDelEspacio = async (espacioId) => {
        try {
            const response = await espaciosAPI.obtenerRecursosDeEspacio(espacioId);
            setRecursosDelEspacio(response.data);
        } catch (err) {
            console.error('Error cargando recursos del espacio:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRecursoAsignacionChange = (e) => {
        const { name, value } = e.target;
        setRecursoAsignacion(prev => ({
            ...prev,
            [name]: name === 'cantidad_maxima' ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (espacioEditando) {
                await espaciosAPI.actualizar(espacioEditando.id, formData);
            } else {
                await espaciosAPI.crear(formData);
            }

            await cargarDatos();
            resetForm();

        } catch (err) {
            console.error('Error guardando espacio:', err);
            setError(err.response?.data?.error || 'Error al guardar el espacio');
        }
    };

    const handleAsignarRecurso = async (e) => {
        e.preventDefault();
        try {
            await espaciosRecursosAPI.asignar(asignandoRecursos, [recursoAsignacion]);
            await cargarRecursosDelEspacio(asignandoRecursos);
            setRecursoAsignacion({ recurso_id: '', cantidad_maxima: 1 });
            setError(null);
        } catch (err) {
            console.error('Error asignando recurso:', err);
            setError('Error al asignar el recurso al espacio');
        }
    };

    const handleQuitarRecurso = async (espacioId, recursoId) => {
        try {
            // Necesitarás crear este endpoint en el backend
            await espaciosRecursosAPI.quitar(espacioId, recursoId);
            await cargarRecursosDelEspacio(espacioId);
        } catch (err) {
            console.error('Error quitando recurso:', err);
            setError('Error al quitar el recurso del espacio');
        }
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            descripcion: '',
            capacidad: '',
            ubicacion: '',
            estado: 'disponible',
            requiere_aprobacion: true,
            max_horas_por_reserva: 8,
            imagen_url: ''
        });
        setEspacioEditando(null);
        setMostrarFormulario(false);
        setMostrarRecursos(null);
        setAsignandoRecursos(null);
        setMostrarDetalles(null);
    };

    const handleEditar = (espacio) => {
        setEspacioEditando(espacio);
        setFormData({
            nombre: espacio.nombre,
            descripcion: espacio.descripcion || '',
            capacidad: espacio.capacidad || '',
            ubicacion: espacio.ubicacion || '',
            estado: espacio.estado,
            requiere_aprobacion: espacio.requiere_aprobacion,
            max_horas_por_reserva: espacio.max_horas_por_reserva || 8,
            imagen_url: espacio.imagen_url || ''
        });
        setMostrarFormulario(true);
    };

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este espacio?')) {
            return;
        }

        try {
            await espaciosAPI.eliminar(id);
            await cargarDatos();
        } catch (err) {
            console.error('Error eliminando espacio:', err);
            setError(err.response?.data?.error || 'Error al eliminar el espacio');
        }
    };

    const handleVerRecursos = async (espacio) => {
        setMostrarRecursos(espacio.id);
        setAsignandoRecursos(null);
        await cargarRecursosDelEspacio(espacio.id);
    };

    const handleAsignarRecursos = (espacio) => {
        setAsignandoRecursos(espacio.id);
        setMostrarRecursos(null);
    };

    if (loading) {
        return <div className="loading">Cargando espacios...</div>;
    }

    return (
        <>
        {mostrarDetalles && (
            <EspacioDetail 
                espacioId={mostrarDetalles} 
                onClose={() => setMostrarDetalles(null)}
            />
        )}
        <div className="gestion-espacios">
            {onVolver && (
                <div className="modulo-header">
                    <button onClick={onVolver} className="btn-volver">
                        ← Volver al Calendario
                    </button>
                </div>
            )}

            <div className="header">
                <h2>🏢 Gestión de Espacios</h2>
                <button
                    onClick={() => setMostrarFormulario(true)}
                    className="btn-nuevo"
                >
                    ➕ Nuevo Espacio
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* FORMULARIO PRINCIPAL DE ESPACIO */}
            {mostrarFormulario && (
                <div className="formulario-container">
                    <h3>{espacioEditando ? 'Editar Espacio' : 'Nuevo Espacio'}</h3>

                    <form onSubmit={handleSubmit} className="espacio-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre *</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Capacidad</label>
                                <input
                                    type="number"
                                    name="capacidad"
                                    value={formData.capacidad}
                                    onChange={handleInputChange}
                                    min="1"
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
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Ubicación</label>
                                <input
                                    type="text"
                                    name="ubicacion"
                                    value={formData.ubicacion}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Estado</label>
                                <select
                                    name="estado"
                                    value={formData.estado}
                                    onChange={handleInputChange}
                                >
                                    <option value="disponible">Disponible</option>
                                    <option value="en_mantenimiento">En Mantenimiento</option>
                                    <option value="clausurado">Clausurado</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Máximo horas por reserva</label>
                                <input
                                    type="number"
                                    name="max_horas_por_reserva"
                                    value={formData.max_horas_por_reserva}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="24"
                                />
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        name="requiere_aprobacion"
                                        checked={formData.requiere_aprobacion}
                                        onChange={handleInputChange}
                                    />
                                    Requiere aprobación
                                </label>
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-guardar">
                                {espacioEditando ? 'Actualizar' : 'Crear'} Espacio
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

            {/* SECCIÓN ASIGNAR RECURSOS */}
            {asignandoRecursos && (
                <div className="asignar-recursos-container">
                    <h3>🔗 Asignar Recursos a {espacios.find(e => e.id === asignandoRecursos)?.nombre}</h3>

                    <form onSubmit={handleAsignarRecurso} className="asignacion-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Recurso</label>
                                <select
                                    name="recurso_id"
                                    value={recursoAsignacion.recurso_id}
                                    onChange={handleRecursoAsignacionChange}
                                    required
                                >
                                    <option value="">Seleccionar recurso</option>
                                    {recursos.map(recurso => (
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
                                    value={recursoAsignacion.cantidad_maxima}
                                    onChange={handleRecursoAsignacionChange}
                                    min="1"
                                    max={recursos.find(r => r.id === parseInt(recursoAsignacion.recurso_id))?.cantidad_total || 1}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-guardar">
                                ➕ Asignar Recurso
                            </button>
                            <button
                                type="button"
                                onClick={() => setAsignandoRecursos(null)}
                                className="btn-cancelar"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* SECCIÓN VER RECURSOS ASIGNADOS */}
            {mostrarRecursos && (
                <div className="recursos-container">
                    <h3>🎛️ Recursos de {espacios.find(e => e.id === mostrarRecursos)?.nombre}</h3>

                    {recursosDelEspacio.length > 0 ? (
                        <div className="recursos-list">
                            {recursosDelEspacio.map(recurso => (
                                <div key={recurso.id} className="recurso-item">
                                    <div className="recurso-info">
                                        <strong>{recurso.nombre}</strong>
                                        <span>Cantidad máxima: {recurso.cantidad_maxima}</span>
                                        <span>Stock total: {recurso.cantidad_total}</span>
                                    </div>
                                    <button
                                        onClick={() => handleQuitarRecurso(mostrarRecursos, recurso.id)}
                                        className="btn-eliminar"
                                    >
                                        🗑️ Quitar
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No hay recursos asignados a este espacio.</p>
                    )}

                    <button
                        onClick={() => handleAsignarRecursos(espacios.find(e => e.id === mostrarRecursos))}
                        className="btn-nuevo"
                    >
                        ➕ Agregar Recursos
                    </button>
                </div>
            )}

            {/* TABLA DE ESPACIOS */}
            <div className="espacios-table-container">
                <table className="espacios-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Capacidad</th>
                            <th>Ubicación</th>
                            <th>Estado</th>
                            <th>Aprobación</th>
                            <th>Detalles</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {espacios.map(espacio => (
                            <tr key={espacio.id}>
                                <td>
                                    <strong>{espacio.nombre}</strong>
                                    {espacio.descripcion && (
                                        <div className="descripcion">{espacio.descripcion}</div>
                                    )}
                                </td>
                                <td>{espacio.capacidad || '-'}</td>
                                <td>{espacio.ubicacion || '-'}</td>
                                <td>
                                    <span className={`estado ${espacio.estado}`}>
                                        {espacio.estado}
                                    </span>
                                </td>
                                <td>
                                    {espacio.requiere_aprobacion ? (
                                        <span style={{ color: '#f39c12', fontWeight: 'bold' }}>✓ Requiere</span>
                                    ) : (
                                        <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✗ No requiere</span>
                                    )}
                                </td>
                                <td>
                                    <button
                                        onClick={() => {
                                            console.log('🔍 Abriendo detalles del espacio:', espacio.id);
                                            setMostrarDetalles(espacio.id);
                                        }}
                                        className="btn-detalles"
                                        title="Ver detalles completos y reservas"
                                    >
                                        👁️ Ver Detalles
                                    </button>
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleEditar(espacio)}
                                        className="btn-editar"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(espacio.id)}
                                        className="btn-eliminar"
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        </>
    );
};

export default GestionEspacios;