import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import './App.css';

// Componente principal de la app una vez logueado
const Dashboard = () => {
  const { user, logout } = useAuth();

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
        <div className="welcome-message">
          <h2>¡Bienvenido al Sistema!</h2>
          <p>Selecciona un módulo para comenzar:</p>
          
          <div className="modules-grid">
            <div className="module-card">
              <h3>📅 Registro de Eventos</h3>
              <p>Gestiona los eventos universitarios</p>
              <button disabled>Próximamente</button>
            </div>
            
            <div className="module-card">
              <h3>🏢 Reserva de Espacios</h3>
              <p>Reserva aulas y laboratorios</p>
              <button disabled>Próximamente</button>
            </div>
            
            {user.role === 'admin' && (
              <div className="module-card">
                <h3>👥 Administración</h3>
                <p>Gestiona usuarios del sistema</p>
                <button disabled>Próximamente</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Componente que decide qué mostrar
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