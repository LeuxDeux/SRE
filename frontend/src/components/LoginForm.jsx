import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/LoginForm.css';

const LoginForm = () => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      return;
    }

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      // El AuthContext ya maneja la redirección automática
      console.log('Login exitoso');
    } else {
      // El error ya se muestra automáticamente desde el contexto
      console.log('Login fallido');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏫 Universidad App</h1>
          <p>Sistema de Eventos y Reservas</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Ingresa tu usuario"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingresa tu contraseña"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading || !formData.username || !formData.password}
          >
            {loading ? '🔄 Iniciando sesión...' : '🔐 Iniciar Sesión'}
          </button>
        </form>

        <div className="login-footer">
          <p>Usuarios de prueba:</p>
          <ul>
            <li><strong>admin</strong> / password (Administrador)</li>
            <li><strong>maria.garcia</strong> / password (Secretaría Académica)</li>
            <li><strong>juan.lopez</strong> / password (Secretaría de Alumnos)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;