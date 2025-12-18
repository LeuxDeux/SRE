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
          <h1><svg width="24" height="24" viewBox="0 0 595.3 699.4" xmlns="http://www.w3.org/2000/svg">
  <path d="m246.6 0h102v190.8c80.8-22.4 140.4-96.7 140.4-184.4h106.3c0 146.5-106.8 268.9-246.6 293.2v4.4h233.9v104.2h-214.4c130 31.8 227 149.5 227 289.1h-106.2c0-87.7-59.6-162-140.3-184.4v186.5h-102v-186.5c-80.7 22.4-140.3 96.7-140.3 184.4h-106.4c0-139.6 97-257.3 227-289.1h-214.2v-104.2h233.9v-4.4c-139.9-24.3-246.7-146.7-246.7-293.2h106.3c0 87.7 59.6 162 140.3 184.4z" fill="#1E3A8A"/>
</svg> UTN FRRq</h1>
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
        </div>
      </div>
    </div>
  );
};

export default LoginForm;