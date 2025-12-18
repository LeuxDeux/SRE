import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI, secretariasAPI } from '../services/api';
import '../styles/GestionUsuarios.css';

const GestionUsuarios = ({ onClose }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secretarias, setSecretarias] = useState([]);
  const [cargandoSecretarias, setCargandoSecretarias] = useState(true);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);
  const [passwordsCoinciden, setPasswordsCoinciden] = useState(true);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmar_password: '',
    nombre_completo: '',
    email: '',
    telefono: '',
    role: 'secretaria',
    secretaria_id: '',
    activo: true
  });

  const [passwordData, setPasswordData] = useState({
    nueva_password: '',
    confirmar_password: ''
  });

  // Opciones predefinidas
  const roles = [
    { value: 'admin', label: '👑 Administrador' },
    { value: 'secretaria', label: '📋 Secretaría' },
    { value: 'usuario', label: '👤 Usuario' }
  ];

  // Cargar secretarias desde API
  const cargarSecretarias = useCallback(async () => {
    try {
      setCargandoSecretarias(true);
      const response = await secretariasAPI.obtenerTodas();
      setSecretarias(response.data.secretarias);
    } catch (error) {
      console.error('Error cargando secretarias:', error);
      // Fallback a datos hardcodeados si la API falla
      setSecretarias([
        { id: 1, nombre: 'Administración' },
        { id: 2, nombre: 'Secretaría Académica' },
        { id: 3, nombre: 'Secretaría de Alumnos' },
        { id: 4, nombre: 'Secretaría de Extensión' },
        { id: 5, nombre: 'Secretaría de Investigación' },
        { id: 6, nombre: 'Tesorería' },
        { id: 7, nombre: 'Bedelía' }
      ]);
    } finally {
      setCargandoSecretarias(false);
    }
  }, []);

  // Cargar usuarios
  const cargarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAPI.obtenerTodos();
      setUsuarios(response.data.usuarios);
      setError('');
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
    cargarSecretarias();
  }, [cargarUsuarios, cargarSecretarias]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => {
      const nuevosDatos = {
        ...prev,
        [name]: value
      };
      
      // Validar que las contraseñas coincidan
      if (name === 'nueva_password') {
        setPasswordsCoinciden(value === nuevosDatos.confirmar_password);
      } else if (name === 'confirmar_password') {
        setPasswordsCoinciden(value === nuevosDatos.nueva_password);
      }
      
      return nuevosDatos;
    });
  };

  // Crear o actualizar usuario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validación de contraseñas para nuevo usuario
    if (!usuarioEditando) {
      if (formData.password !== formData.confirmar_password) {
        setError('Las contraseñas no coinciden');
        return;
      }
      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
    }

    try {
      if (usuarioEditando) {
        // Actualizar usuario existente
        await usersAPI.actualizar(usuarioEditando.id, formData);
        setSuccess('Usuario actualizado exitosamente');
      } else {
        // Crear nuevo usuario (sin enviar confirmar_password al backend)
        const { confirmar_password, ...datosEnvio } = formData;
        await usersAPI.crear(datosEnvio);
        setSuccess('Usuario creado exitosamente');
      }

      // Limpiar y recargar
      setShowForm(false);
      setUsuarioEditando(null);
      setFormData({
        username: '',
        password: '',
        confirmar_password: '',
        nombre_completo: '',
        email: '',
        telefono: '',
        role: 'secretaria',
        secretaria_id: '',
        activo: true
      });
      
      cargarUsuarios();
      
    } catch (error) {
      console.error('Error guardando usuario:', error);
      setError(error.response?.data?.error || 'Error al guardar el usuario');
    }
  };

  // Resetear password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.nueva_password !== passwordData.confirmar_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.nueva_password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await usersAPI.resetearPassword(usuarioEditando.id, {
        nueva_password: passwordData.nueva_password
      });
      
      setSuccess('Contraseña actualizada exitosamente');
      setShowResetPassword(false);
      setPasswordData({ nueva_password: '', confirmar_password: '' });
      
    } catch (error) {
      console.error('Error reseteando password:', error);
      setError(error.response?.data?.error || 'Error al resetear la contraseña');
    }
  };

  // Editar usuario
  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setFormData({
      username: usuario.username,
      password: '', // No mostrar password actual
      nombre_completo: usuario.nombre_completo,
      email: usuario.email || '',
      telefono: usuario.telefono || '',
      role: usuario.role,
      secretaria_id: usuario.secretaria_id || '',
      activo: usuario.activo
    });
    setShowForm(true);
  };

  // Abrir modal de reset password
  const handleAbrirResetPassword = (usuario) => {
    setUsuarioEditando(usuario);
    setShowResetPassword(true);
  };

  // Cancelar operaciones
  const cancelarForm = () => {
    setShowForm(false);
    setShowResetPassword(false);
    setUsuarioEditando(null);
    setFormData({
      username: '',
      password: '',
      confirmar_password: '',
      nombre_completo: '',
      email: '',
      telefono: '',
      role: 'secretaria',
      secretaria_id: '',
      activo: true
    });
    setPasswordData({
      nueva_password: '',
      confirmar_password: ''
    });
    setMostrarPassword(false);
    setMostrarConfirmarPassword(false);
    setPasswordsCoinciden(true);
    setError('');
    setSuccess('');
  };

  // Formatear fecha
  const formatearFecha = (fechaString) => {
    return new Date(fechaString).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="gestion-usuarios">
      {/* HEADER */}
      <div className="header">
        <button onClick={onClose} className="btn-volver">← Volver al Inicio</button>
        <h2>👥 Gestión de Usuarios</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-nuevo-usuario"
        >
          ➕ Nuevo Usuario
        </button>
      </div>

      {/* MENSAJES */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="success-message">
          ✅ {success}
        </div>
      )}

      {/* FORMULARIO CREAR/EDITAR USUARIO */}
      {showForm && (
        <div className="usuario-form-overlay">
          <div className="usuario-form">
            <h3>{usuarioEditando ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Usuario *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="usuario.ejemplo"
                />
              </div>

              {!usuarioEditando && (
                <>
                  <div className="form-group">
                    <label>Contraseña *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={mostrarPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!usuarioEditando}
                        placeholder="Mínimo 6 caracteres"
                        minLength="6"
                      />
                      <button
                        type="button"
                        className="btn-toggle-password"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {mostrarPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Confirmar Contraseña *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={mostrarConfirmarPassword ? "text" : "password"}
                        name="confirmar_password"
                        value={formData.confirmar_password}
                        onChange={handleChange}
                        required={!usuarioEditando}
                        placeholder="Repetir contraseña"
                        className={formData.confirmar_password && formData.password !== formData.confirmar_password ? 'input-error' : ''}
                      />
                      <button
                        type="button"
                        className="btn-toggle-password"
                        onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}
                        title={mostrarConfirmarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {mostrarConfirmarPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                    {formData.confirmar_password && formData.password !== formData.confirmar_password && (
                      <small className="password-error">⚠️ Las contraseñas no coinciden</small>
                    )}
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  required
                  placeholder="Nombre Apellido"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="usuario@universidad.edu"
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="3482-123456"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    {roles.map(rol => (
                      <option key={rol.value} value={rol.value}>
                        {rol.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Secretaría</label>
                  <select
                    name="secretaria_id"
                    value={formData.secretaria_id}
                    onChange={handleChange}
                    disabled={cargandoSecretarias}
                  >
                    <option value="">Seleccionar secretaría</option>
                    {secretarias.map(secret => (
                      <option key={secret.id} value={secret.id}>
                        {secret.nombre}
                      </option>
                    ))}
                  </select>
                  {cargandoSecretarias && (
                    <small className="field-hint">Cargando secretarías...</small>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select
                  name="activo"
                  value={formData.activo}
                  onChange={handleChange}
                >
                  <option value={true}>✅ Activo</option>
                  <option value={false}>❌ Inactivo</option>
                </select>
              </div>


              <div className="form-actions">
                <button type="button" onClick={cancelarForm} className="btn-cancel">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={cargandoSecretarias}
                >
                  {usuarioEditando ? '💾 Actualizar' : '✅ Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESET PASSWORD */}
      {showResetPassword && usuarioEditando && (
        <div className="usuario-form-overlay">
          <div className="usuario-form">
            <h3>🔑 Resetear Contraseña</h3>
            <p>Usuario: <strong>{usuarioEditando.nombre_completo}</strong></p>
            
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Nueva Contraseña *</label>
                <div className="password-input-wrapper">
                  <input
                    type={mostrarPassword ? "text" : "password"}
                    name="nueva_password"
                    value={passwordData.nueva_password}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Mínimo 6 caracteres"
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {mostrarPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirmar Contraseña *</label>
                <div className="password-input-wrapper">
                  <input
                    type={mostrarConfirmarPassword ? "text" : "password"}
                    name="confirmar_password"
                    value={passwordData.confirmar_password}
                    onChange={handlePasswordChange}
                    required
                    placeholder="Repetir contraseña"
                    className={!passwordsCoinciden && passwordData.confirmar_password ? 'input-error' : ''}
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}
                    title={mostrarConfirmarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {mostrarConfirmarPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {!passwordsCoinciden && passwordData.confirmar_password && (
                  <small className="password-error">⚠️ Las contraseñas no coinciden</small>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={cancelarForm} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-submit">
                  🔑 Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLA DE USUARIOS */}
      <div className="table-container">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Secretaría</th>
              <th>Estado</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(usuario => (
              <tr key={usuario.id} className={!usuario.activo ? 'usuario-inactivo' : ''}>
                <td className="usuario-username">
                  <strong>{usuario.username}</strong>
                </td>
                <td className="usuario-nombre">{usuario.nombre_completo}</td>
                <td className="usuario-email">{usuario.email || '-'}</td>
                <td className="usuario-rol">
                  <span className={`rol-badge rol-${usuario.role}`}>
                    {usuario.role === 'admin' ? '👑 Admin' : 
                     usuario.role === 'secretaria' ? '📋 Secretaría' : 
                     '👤 Usuario'}
                  </span>
                </td>
                <td className="usuario-secretaria">{usuario.secretaria_nombre || '-'}</td>
                <td className="usuario-estado">
                  <span className={`estado-badge ${usuario.activo ? 'activo' : 'inactivo'}`}>
                    {usuario.activo ? '✅ Activo' : '❌ Inactivo'}
                  </span>
                </td>
                <td className="usuario-fecha">
                  {formatearFecha(usuario.created_at)}
                </td>
                <td className="usuario-acciones">
                  <button 
                    onClick={() => handleEditar(usuario)}
                    className="btn-editar"
                    title="Editar usuario"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleAbrirResetPassword(usuario)}
                    className="btn-reset-password"
                    title="Resetear contraseña"
                  >
                    🔑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {usuarios.length === 0 && (
          <div className="empty-table">
            <p>No hay usuarios registrados</p>
            <button 
              onClick={() => setShowForm(true)}
              className="btn-nuevo-usuario"
            >
              ➕ Crear primer usuario
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionUsuarios;