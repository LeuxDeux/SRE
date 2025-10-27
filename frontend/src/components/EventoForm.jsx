import React, { useState, useEffect } from 'react';
import { eventosAPI } from '../services/api';
import '../styles/EventoForm.css';

const EventoForm = ({ evento, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    fecha_evento: '',
    descripcion: '',
    categoria: 'Académico'
  });
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Si estamos editando, cargar los datos del evento
  useEffect(() => {
    if (evento) {
      // Formatear fecha para el input date
      const fechaFormateada = new Date(evento.fecha_evento).toISOString().split('T')[0];
      
      setFormData({
        nombre: evento.nombre || '',
        fecha_evento: fechaFormateada,
        descripcion: evento.descripcion || '',
        categoria: evento.categoria || 'Académico'
      });
    }
  }, [evento]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        e.target.value = ''; // Limpiar input
        return;
      }
      
      // Validar tipo de archivo
      const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        setError('Tipo de archivo no permitido. Solo PDF, imágenes y documentos.');
        e.target.value = ''; // Limpiar input
        return;
      }
      
      setArchivo(file);
      setError(''); // Limpiar error si todo está bien
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || !formData.fecha_evento) {
      setError('Nombre y fecha del evento son requeridos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('fecha_evento', formData.fecha_evento);
      formDataToSend.append('descripcion', formData.descripcion);
      formDataToSend.append('categoria', formData.categoria);

      if (archivo) {
        formDataToSend.append('archivo_adjunto', archivo);
      }

      let response;
      
      if (evento) {
        // Actualizar evento existente
        response = await eventosAPI.actualizar(evento.id, formDataToSend);
      } else {
        // Crear nuevo evento
        response = await eventosAPI.crear(formDataToSend);
      }

      if (response.data.success) {
        onSave(response.data.evento);
      }
      
    } catch (error) {
      console.error('Error guardando evento:', error);
      setError(error.response?.data?.error || 'Error al guardar el evento');
    } finally {
      setLoading(false);
    }
  };

  const categorias = ['Académico', 'Cultural', 'Administrativo', 'Urgente'];

  return (
    <div className="evento-form-container">
      <div className="evento-form-header">
        <h2>{evento ? '✏️ Editar Evento' : '➕ Crear Nuevo Evento'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="evento-form">
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="nombre">Nombre del Evento *</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ingresa el nombre del evento"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fecha_evento">Fecha del Evento *</label>
          <input
            type="date"
            id="fecha_evento"
            name="fecha_evento"
            value={formData.fecha_evento}
            onChange={handleChange}
            disabled={loading}
            min={new Date().toISOString().split('T')[0]} // No permitir fechas pasadas
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="categoria">Categoría</label>
          <select
            id="categoria"
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            disabled={loading}
          >
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            placeholder="Describe el evento..."
            disabled={loading}
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="archivo_adjunto">Archivo Adjunto (Opcional)</label>
          <input
            type="file"
            id="archivo_adjunto"
            onChange={handleFileChange}
            disabled={loading}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <small className="file-hint">
            Formatos permitidos: PDF, JPG, PNG, DOC, DOCX (Máximo 10MB)
          </small>
          {archivo && (
            <div className="file-info">
              📎 Archivo seleccionado: {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
          {evento?.archivo_adjunto && !archivo && (
            <div className="file-info">
              📎 Archivo actual: {evento.archivo_adjunto}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn-cancel"
            disabled={loading}
          >
            Cancelar
          </button>
          
          <button 
            type="submit" 
            className="btn-submit"
            disabled={loading || !formData.nombre.trim() || !formData.fecha_evento}
          >
            {loading ? '🔄 Guardando...' : (evento ? '💾 Actualizar' : '✅ Crear')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventoForm;