import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import EventosTable from './components/EventosTable';
import EventoForm from './components/EventoForm';
import EventoDetail from './components/EventoDetail';
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
                ← Volver al Dashboard
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
                ← Volver al Dashboard
              </button>
              <h2>🏢 Gestión de Reservas</h2>
            </div>
            <p>Módulo de reservas en desarrollo...</p>
          </div>
        );
      
      default:
        return (
          <div className="welcome-message">
            <h2>¡Bienvenido al Sistema!</h2>
            <p>Selecciona un módulo para comenzar:</p>
            
            <div className="modules-grid">
              <div className="module-card">
                <h3>📅 Registro de Eventos</h3>
                <p>Gestiona los eventos universitarios</p>
                <button 
                  onClick={() => setModuloActivo('eventos')}
                  className="module-button"
                >
                  Acceder al Módulo
                </button>
              </div>
              
              <div className="module-card">
                <h3>🏢 Reserva de Espacios</h3>
                <p>Reserva aulas y laboratorios</p>
                <button 
                  onClick={() => setModuloActivo('reservas')}
                  className="module-button"
                >
                  Acceder al Módulo
                </button>
              </div>
              
              {user.role === 'admin' && (
                <div className="module-card">
                  <h3>👥 Administración</h3>
                  <p>Gestiona usuarios del sistema</p>
                  <button disabled className="module-button">
                    Próximamente
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
        <h1>🏫 Sistema Universidad</h1>
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