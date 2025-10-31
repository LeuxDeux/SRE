import React, { useState, useEffect, useCallback } from 'react';
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
    dias_antelacion: 15
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
      if (editando) {
        await categoriasAPI.actualizar(editando.id, formData);
      } else {
        await categoriasAPI.crear(formData);
      }
      
      setShowForm(false);
      setEditando(null);
      setFormData({ nombre: '', color: '#3498db' });
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
      dias_antelacion: categoria.dias_antelacion
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
    setFormData({ nombre: '', color: '#3498db' });
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
        <button onClick={onClose} className="btn-volver">← Volver</button>
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
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
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
                    onClick={() => setFormData({...formData, color})}
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
                required
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
                required
              />
              <small className="field-hint">Días mínimos de anticipación para eventos de esta categoría</small>
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