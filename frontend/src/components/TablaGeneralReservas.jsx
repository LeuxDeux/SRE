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
           reserva.requiere_aprobacion === true;
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
                                <tr key={reserva.id} className={reserva.creador_id === user.id ? 'mi-reserva' : ''}>
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
                                    </td>
                                    <td>
                                        <span className={`estado-badge ${reserva.estado}`}>
                                            {reserva.estado}
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
                                            <button 
                                                className="btn-ver"
                                                title="Ver detalles"
                                            >
                                                👁️
                                            </button>
                                            
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
        </div>
    );
};

export default TablaGeneralReservas;