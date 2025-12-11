import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import EventosTable from './components/EventosTable';
import EventoForm from './components/EventoForm';
import EventoDetail from './components/EventoDetail';
import GestionCategorias from './components/GestionCategorias';
import GestionUsuarios from './components/GestionUsuarios';
import ReservasCalendar from './components/ReservasCalendar';
import './App.css';

// Componente Dashboard con navegación entre módulos
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [moduloActivo, setModuloActivo] = useState(null);
  const [vistaEventos, setVistaEventos] = useState('lista'); // 'lista', 'nuevo', 'editar', 'detalle'
  const [eventoEditando, setEventoEditando] = useState(null);
  const [eventoDetalleId, setEventoDetalleId] = useState(null);

  const handleNuevoEvento = () => {
    setEventoEditando(null);
    setVistaEventos('nuevo');
  };

  const handleEditarEvento = (evento) => {
    setEventoEditando(evento);
    setVistaEventos('editar');
  };

  const handleVerDetalles = (id) => {
    setEventoDetalleId(id);
    setVistaEventos('detalle');
  };

  const handleGuardarEvento = (eventoGuardado) => {
    console.log('Evento guardado:', eventoGuardado);
    setVistaEventos('lista');
    // Aquí podrías recargar la lista de eventos si es necesario
  };

  const handleCancelarEvento = () => {
    setVistaEventos('lista');
    setEventoEditando(null);
  };

  const handleVolverDetalle = () => {
    setVistaEventos('lista');
    setEventoDetalleId(null);
  };

  const renderModuloEventos = () => {
    switch (vistaEventos) {
      case 'nuevo':
        return (
          <EventoForm
            onSave={handleGuardarEvento}
            onCancel={handleCancelarEvento}
          />
        );
      
      case 'editar':
        return (
          <EventoForm
            evento={eventoEditando}
            onSave={handleGuardarEvento}
            onCancel={handleCancelarEvento}
          />
        );
      
      case 'detalle':
        return (
          <EventoDetail
            eventoId={eventoDetalleId}
            onClose={handleVolverDetalle}
          />
        );
      
      default:
        return (
          <EventosTable
            onEditEvento={handleEditarEvento}
            onViewDetails={handleVerDetalles}
            onNuevoEvento={handleNuevoEvento}
          />
        );
    }
  };

  const renderModulo = () => {
    switch (moduloActivo) {
      case 'eventos':
        return (
          <div className="modulo-container">
            <div className="modulo-header">
              <button
                onClick={() => {
                  setModuloActivo(null);
                  setVistaEventos('lista');
                  setEventoEditando(null);
                  setEventoDetalleId(null);
                }}
                className="btn-volver"
              >
                ← Volver al Inicio
              </button>
              <h2>📅 Gestión de Eventos</h2>
              {vistaEventos === 'lista' && (
                <button
                  onClick={handleNuevoEvento}
                  className="btn-nuevo-evento"
                >
                  ➕ Nuevo Evento
                </button>
              )}
            </div>
            {renderModuloEventos()}
          </div>
        );

      case 'reservas':
        return (
          <div className="modulo-container">
            <div className="modulo-header">
              <button
                onClick={() => setModuloActivo(null)}
                className="btn-volver"
              >
                ← Volver al Inicio
              </button>
              <h2>🏢 Gestión de Reservas</h2>
            </div>
            <ReservasCalendar />
          </div>
        );

      case 'categorias':
        return (
          <div className="modulo-container">
            <div className="modulo-header">
              <button
                onClick={() => setModuloActivo(null)}
                className="btn-volver"
              >
                ← Volver al Inicio
              </button>
              <h2>🎯 Gestión de Categorías</h2>
            </div>
            <GestionCategorias />
          </div>
        );

      case 'usuarios':
        return (
          <div className="modulo-container">
            <div className="modulo-header">
              <button
                onClick={() => setModuloActivo(null)}
                className="btn-volver"
              >
                ← Volver al Inicio
              </button>
              <h2>👥 Gestión de Usuarios</h2>
            </div>
            <GestionUsuarios onClose={() => setModuloActivo(null)} />
          </div>
        );

      default:
        return (
          <div className="welcome-message">
            <h2>¡Bienvenido al Sistema!</h2>
            <p>Selecciona un módulo para comenzar:</p>

            <div className="modules-grid">
              {(user.role === 'admin' || user.role === 'secretaria') && (
                <div className="module-card">
                  <h3>📅 Registro de Eventos a Comunicar</h3>
                  <p>Gestiona los eventos universitarios</p>
                  <button
                    onClick={() => setModuloActivo('eventos')}
                    className="module-button"
                  >
                    Acceder
                  </button>
                </div>
              )}

              <div className="module-card">
                <h3>🏢 Reserva de Espacios</h3>
                <p>Reserva aulas y laboratorios</p>
                <button
                  onClick={() => setModuloActivo('reservas')}
                  className="module-button"
                >
                  Acceder
                </button>
              </div>

              {user.role === 'admin' && (
                <div className="module-card">
                  <h3>👥 Administración</h3>
                  <p>Gestiona usuarios del sistema</p>
                  <button
                    onClick={() => setModuloActivo('usuarios')}
                    className="module-button"
                  >
                    Gestionar Usuarios
                  </button>
                </div>
              )}
              {user.role === 'admin' && (
                <div className="module-card">
                  <h3>🎯 Categorías</h3>
                  <p>Gestionar categorías de eventos</p>
                <button
                  onClick={() => setModuloActivo('categorias')}
                  className="module-button"
                >
                  Gestionar Categorías
                </button>
              </div>
            )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1><svg width="32" height="32" viewBox="0 0 595.3 699.4" xmlns="http://www.w3.org/2000/svg">
  <path d="m246.6 0h102v190.8c80.8-22.4 140.4-96.7 140.4-184.4h106.3c0 146.5-106.8 268.9-246.6 293.2v4.4h233.9v104.2h-214.4c130 31.8 227 149.5 227 289.1h-106.2c0-87.7-59.6-162-140.3-184.4v186.5h-102v-186.5c-80.7 22.4-140.3 96.7-140.3 184.4h-106.4c0-139.6 97-257.3 227-289.1h-214.2v-104.2h233.9v-4.4c-139.9-24.3-246.7-146.7-246.7-293.2h106.3c0 87.7 59.6 162 140.3 184.4z" fill="#1E3A8A"/>
</svg> Sistema de Reserva de Espacios y Registro de Eventos UTN - FRRq</h1>

        <div className="user-info">
          <span>Bienvenido, <strong>{user.username}</strong> ({user.role})</span>
          <button onClick={logout} className="logout-button">
            Cerrar Sesión
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {renderModulo()}
      </main>
    </div>
  );
};

// Componente que decide qué mostrar (Login o Dashboard)
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verificando sesión...</p>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginForm />;
};

// App principal
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;