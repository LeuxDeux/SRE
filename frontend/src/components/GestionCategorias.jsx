import React, { useState, useEffect, useCallback } from 'react';
import { Tooltip } from 'react-tooltip';
import { categoriasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/GestionCategorias.css';

const GestionCategorias = ({ onClose }) => {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    color: '#3498db',
    prioridad: 'media',
    dias_antelacion: 15,
    emails: [],
    nuevoEmail: '',
    descripcion: '',
    activa: true
  });
  const [editando, setEditando] = useState(null);

  // Colores predefinidos
  const coloresPredefinidos = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
    '#16a085', '#8e44ad', '#2c3e50', '#f1c40f'
  ];

  const cargarCategorias = useCallback(async () => {
    try {
      setLoading(true);
      const response = user.role === 'admin'
        ? await categoriasAPI.obtenerTodasAdmin()
        : await categoriasAPI.obtenerTodas();

      setCategorias(response.data.categorias);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const datosEnvio = {
        nombre: formData.nombre,
        color: formData.color,
        prioridad: formData.prioridad,
        dias_antelacion: formData.dias_antelacion,
        emails: formData.emails,
        descripcion: formData.descripcion,
        activa: formData.activa
      };

      if (editando) {
        await categoriasAPI.actualizar(editando.id, datosEnvio);
      } else {
        await categoriasAPI.crear(datosEnvio);
      }

      setShowForm(false);
      setEditando(null);
      setFormData({ nombre: '', color: '#3498db', prioridad: 'media', dias_antelacion: 15, emails: [], nuevoEmail: '', descripcion: '', activa: true });
      cargarCategorias();

    } catch (error) {
      console.error('Error guardando categoría:', error);
      alert(error.response?.data?.error || 'Error al guardar la categoría');
    }
  };

  const handleEditar = (categoria) => {
    setEditando(categoria);
    setFormData({
      nombre: categoria.nombre,
      color: categoria.color,
      prioridad: categoria.prioridad,
      dias_antelacion: categoria.dias_antelacion,
      emails: categoria.emails || [],
      nuevoEmail: '',
      descripcion: categoria.descripcion || '',
      activa: categoria.activa
    });
    setShowForm(true);
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?`)) {
      return;
    }

    try {
      await categoriasAPI.eliminar(id);
      cargarCategorias();
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      alert(error.response?.data?.error || 'Error al eliminar la categoría');
    }
  };

  const toggleActiva = async (categoria) => {
    try {
      await categoriasAPI.actualizar(categoria.id, {
        ...categoria,
        activa: !categoria.activa
      });
      cargarCategorias();
    } catch (error) {
      console.error('Error actualizando categoría:', error);
      alert('Error al actualizar la categoría');
    }
  };

  const cancelarForm = () => {
    setShowForm(false);
    setEditando(null);
    setFormData({ nombre: '', color: '#3498db', prioridad: 'media', dias_antelacion: 15, emails: [], nuevoEmail: '', descripcion: '', activa: true });
  };

  const agregarEmail = () => {
    const email = formData.nuevoEmail.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (!formData.emails.includes(email)) {
        setFormData({
          ...formData,
          emails: [...formData.emails, email],
          nuevoEmail: ''
        });
      } else {
        alert('Este email ya está agregado');
      }
    } else {
      alert('Por favor, ingresa un email válido');
    }
  };

  const quitarEmail = (index) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="gestion-categorias">
      <div className="header">
        {/*<button onClick={onClose} className="btn-volver">← Volver</button>*/}
        <h2>🎯 Gestión de Categorías</h2>
        {user.role === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-nueva-categoria"
          >
            ➕ Nueva Categoría
          </button>
        )}
      </div>

      {showForm && user.role === 'admin' && (
        <div className="categoria-form">
          <h3>{editando ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre de la categoría:</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Reunión, Examen, Evento Social..."
              />
            </div>

            <div className="form-group">
              <label>Color:</label>
              <div className="colores-grid">
                {coloresPredefinidos.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    title={color}
                  />
                ))}
              </div>
              <div className="color-picker">
                <span>Color personalizado:</span>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
                <span className="color-hex">{formData.color}</span>
              </div>
            </div>
            <div className="form-group">
              <label>Prioridad:</label>
              <select
                value={formData.prioridad}
                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
              >
                <option value="baja">Baja ✅</option>
                <option value="media">Media ⚠️</option>
                <option value="alta">Alta 🚨</option>
              </select>
            </div>

            <div className="form-group">
              <label>Días de antelación mínima:</label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.dias_antelacion}
                onChange={(e) => setFormData({ ...formData, dias_antelacion: parseInt(e.target.value) })}
              />
              <small className="field-hint">Días mínimos de anticipación para eventos de esta categoría</small>
            </div>

            <div className="form-group">
              <label>Correos de notificación (opcional):</label>
              <div className="emails-container">
                <div className="emails-input-group">
                  <input
                    type="email"
                    value={formData.nuevoEmail}
                    onChange={(e) => setFormData({ ...formData, nuevoEmail: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarEmail();
                      }
                    }}
                    placeholder="correo@dominio.com"
                  />
                  <button
                    type="button"
                    onClick={agregarEmail}
                    className="btn-add-email"
                  >
                    ➕ Agregar
                  </button>
                </div>
                <div className="emails-list">
                  {formData.emails.map((email, index) => (
                    <div key={index} className="email-chip">
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => quitarEmail(index)}
                        className="btn-remove-email"
                        title="Eliminar email"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <small className="field-hint">Se enviará información de eventos de esta categoría a estos correos</small>
            </div>

            <div className="form-group">
              <label>Descripción (opcional):</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción detallada de la categoría..."
                rows="4"
              />
              <small className="field-hint">Información adicional sobre esta categoría que aparecerá en el tooltip</small>
            </div>

            <div className="form-actions">
              <button type="button" onClick={cancelarForm} className="btn-cancel">
                Cancelar
              </button>
              <button type="submit" className="btn-submit">
                {editando ? '💾 Actualizar' : '✅ Crear Categoría'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="categorias-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Color</th>
              <th>Prioridad</th>
              <th>Días Antelación</th>
              <th>Email Contacto</th>
              <th>Estado</th>
              <th>Fecha Creación</th>
              {user.role === 'admin' && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {categorias.map(categoria => (
              <tr key={categoria.id} className={!categoria.activa ? 'inactiva' : ''}>
                <td className="categoria-nombre">
                  <div
                    className="color-indicator"
                    style={{ backgroundColor: categoria.color }}
                  />
                  {categoria.nombre}
                  {categoria.descripcion && (
                    <>
                      <span
                        data-tooltip-id="categoria-tooltip"
                        data-tooltip-content={categoria.descripcion}
                        data-tooltip-place="top"
                        className="info-icon"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18" style={{ display: 'inline', verticalAlign: 'middle', color: '#127cc1' }}>
                          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.345a.75.75 0 0 1-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 1 0 8.94 6.94ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                        </svg>

                      </span>
                      <Tooltip id="categoria-tooltip" />
                    </>
                  )}
                </td>
                <td className="categoria-color">
                  <div className="color-display">
                    <span
                      className="color-sample"
                      style={{ backgroundColor: categoria.color }}
                    />
                    <span className="color-value">{categoria.color}</span>
                  </div>
                </td>
                <td className="categoria-prioridad">
                  <span className={`prioridad-badge prioridad-${categoria.prioridad}`}>
                    {categoria.prioridad === 'alta' ? '🚨 Alta' :
                      categoria.prioridad === 'media' ? '⚠️ Media' : '✅ Baja'}
                  </span>
                </td>
                <td className="categoria-dias">
                  <span className="dias-badge">
                    {categoria.dias_antelacion} días
                  </span>
                </td>
                <td className="categoria-email">
                  {categoria.emails && categoria.emails.length > 0 ? (
                    <div className="emails-list-display">
                      {categoria.emails.map((email, idx) => (
                        <a key={idx} href={`mailto:${email}`} className="email-badge">
                          {email}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="sin-email">—</span>
                  )}
                </td>
                <td className="categoria-estado">
                  <span className={`estado-badge ${categoria.activa ? 'activa' : 'inactiva'}`}>
                    {categoria.activa ? '✅ Activa' : '❌ Inactiva'}
                  </span>
                </td>
                <td className="categoria-fecha">
                  {new Date(categoria.created_at).toLocaleDateString('es-ES')}
                </td>
                {user.role === 'admin' && (
                  <td className="categoria-acciones">
                    <button
                      onClick={() => toggleActiva(categoria)}
                      className="btn-toggle"
                      title={categoria.activa ? 'Desactivar' : 'Activar'}
                    >
                      {categoria.activa ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleEditar(categoria)}
                      className="btn-editar"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleEliminar(categoria.id, categoria.nombre)}
                      className="btn-eliminar"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {categorias.length === 0 && (
          <div className="empty-table">
            <p>No hay categorías registradas</p>
            {user.role === 'admin' && (
              <button
                onClick={() => setShowForm(true)}
                className="btn-nueva-categoria"
              >
                ➕ Crear primera categoría
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionCategorias;