import React, { useState, useEffect } from 'react';
import { eventosAPI, categoriasAPI } from '../services/api';
import '../styles/EventoForm.css';

const EventoForm = ({ evento, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    fecha_evento: '',
    descripcion: '',
    categoria_id: '',
    correo_contacto: '',
    telefono: '',
    hora_inicio: '',
    hora_fin: '',
    lugar: '',
    publico_destinatario: '',
    links: '',
    observaciones: ''
  });

  const [categorias, setCategorias] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const response = await categoriasAPI.obtenerTodas();
        setCategorias(response.data.categorias);
      } catch (error) {
        console.error('Error cargando categorías:', error);
        setError('Error al cargar las categorías');
      }
    };

    cargarCategorias();
  }, []);

  // Si estamos editando, cargar los datos del evento
  useEffect(() => {
    if (evento) {
      // Formatear fecha para el input date
      const fechaFormateada = new Date(evento.fecha_evento).toISOString().split('T')[0];

      setFormData({
        nombre: evento.nombre || '',
        fecha_evento: fechaFormateada,
        descripcion: evento.descripcion || '',
        categoria_id: evento.categoria_id || '',
        correo_contacto: evento.correo_contacto || '',
        telefono: evento.telefono || '',
        hora_inicio: evento.hora_inicio || '',
        hora_fin: evento.hora_fin || '',
        lugar: evento.lugar || '',
        publico_destinatario: evento.publico_destinatario || '',
        links: evento.links || '',
        observaciones: evento.observaciones || ''
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
  // Nueva función para manejar cambio de categoría
  const handleCategoriaChange = (e) => {
    const categoriaId = e.target.value;
    setFormData(prev => ({ ...prev, categoria_id: categoriaId }));

    // Encontrar la categoría seleccionada para obtener sus reglas
    const cat = categorias.find(c => c.id === parseInt(categoriaId));
    setCategoriaSeleccionada(cat);
  };

  // Calcular fecha mínima basada en la categoría
  const calcularFechaMinima = () => {
    const hoy = new Date();
    if (categoriaSeleccionada && categoriaSeleccionada.dias_antelacion) {
      const fechaMin = new Date(hoy);
      fechaMin.setDate(hoy.getDate() + categoriaSeleccionada.dias_antelacion);
      return fechaMin.toISOString().split('T')[0];
    }
    // Por defecto 15 días si no hay categoría seleccionada
    const fechaMinDefault = new Date(hoy);
    fechaMinDefault.setDate(hoy.getDate() + 15);
    return fechaMinDefault.toISOString().split('T')[0];
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        e.target.value = '';
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

    if (!formData.categoria_id) {
      setError('Por favor selecciona una categoría');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();

      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('fecha_evento', formData.fecha_evento);
      formDataToSend.append('descripcion', formData.descripcion);
      formDataToSend.append('categoria_id', formData.categoria_id);
      formDataToSend.append('correo_contacto', formData.correo_contacto);
      formDataToSend.append('telefono', formData.telefono);
      formDataToSend.append('hora_inicio', formData.hora_inicio);
      formDataToSend.append('hora_fin', formData.hora_fin);
      formDataToSend.append('lugar', formData.lugar);
      formDataToSend.append('publico_destinatario', formData.publico_destinatario);
      formDataToSend.append('links', formData.links);
      formDataToSend.append('observaciones', formData.observaciones);

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

  // Opciones predefinidas para público destinatario
  const opcionesPublico = [
    'Estudiantes',
    'Docentes',
    'Público General',
    'Estudiantes y Docentes',
    'Personal Administrativo',
    'Egresados',
    'Otro'
  ];

  return (
    <div className="evento-form-container">
      <div className="evento-form-header">
        <h2>{evento ? '✏️ Editar Evento' : '➕ Crear Nuevo Evento'}</h2>
        <p className="form-subtitle">Complete todos los campos requeridos (*)</p>
      </div>

      <form onSubmit={handleSubmit} className="evento-form">
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* SECCIÓN: INFORMACIÓN BÁSICA */}
        <div className="form-section">
          <h3>📝 Información Básica del Evento</h3>

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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fecha_evento">Fecha del Evento *</label>
              <input
                type="date"
                id="fecha_evento"
                name="fecha_evento"
                value={formData.fecha_evento}
                onChange={handleChange}
                disabled={loading}
                min={calcularFechaMinima()}
                required
              />
              {categoriaSeleccionada && (
                <div className="categoria-info">
                  <small>
                    <strong>Prioridad:</strong>
                    <span className={`prioridad-${categoriaSeleccionada.prioridad}`}>
                      {categoriaSeleccionada.prioridad === 'alta' ? 'Alta 🚨' :
                        categoriaSeleccionada.prioridad === 'media' ? 'Media ⚠️' : 'Baja ✅'}
                    </span>
                    {' | '}
                    <strong>Antelación mínima:</strong> {categoriaSeleccionada.dias_antelacion} días
                  </small>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="categoria_id">Categoría *</label>
              <select
                id="categoria_id"
                name="categoria_id"
                value={formData.categoria_id}
                onChange={handleCategoriaChange}
                disabled={loading || categorias.length === 0}
                required
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option
                    key={cat.id}
                    value={cat.id}
                    data-color={cat.color}
                    data-prioridad={cat.prioridad}
                    data-dias={cat.dias_antelacion}
                  >
                    {cat.nombre} {cat.prioridad === 'alta' ? '🚨' : cat.prioridad === 'media' ? '⚠️' : '✅'}
                    ({cat.dias_antelacion} días)
                  </option>
                ))}
              </select>
              {categorias.length === 0 && !loading && (
                <small style={{ color: '#dc3545' }}>
                  No hay categorías disponibles. Contacta al administrador.
                </small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción Breve (3-5 líneas) *</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe brevemente el evento, objetivos, actividades principales..."
              disabled={loading}
              rows="4"
              required
            />
            <small className="field-hint">Máximo 500 caracteres</small>
          </div>
        </div>

        {/* SECCIÓN: DATOS DE CONTACTO */}
        <div className="form-section">
          <h3>📞 Datos de Contacto</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="correo_contacto">Correo de Contacto *</label>
              <input
                type="email"
                id="correo_contacto"
                name="correo_contacto"
                value={formData.correo_contacto}
                onChange={handleChange}
                placeholder="ejemplo@universidad.edu"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefono">Teléfono (Opcional)</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="+54 123 456 7890"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN: HORARIOS Y UBICACIÓN */}
        <div className="form-section">
          <h3>🕐 Horarios y Ubicación</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="hora_inicio">Hora de Inicio *</label>
              <input
                type="time"
                id="hora_inicio"
                name="hora_inicio"
                value={formData.hora_inicio}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="hora_fin">Hora de Finalización *</label>
              <input
                type="time"
                id="hora_fin"
                name="hora_fin"
                value={formData.hora_fin}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lugar">Lugar / Espacio *</label>
            <input
              type="text"
              id="lugar"
              name="lugar"
              value={formData.lugar}
              onChange={handleChange}
              placeholder="Ej: Aula Magna, Laboratorio 3, Plataforma Virtual..."
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* SECCIÓN: INFORMACIÓN ADICIONAL */}
        <div className="form-section">
          <h3>🎯 Información Adicional</h3>

          <div className="form-group">
            <label htmlFor="publico_destinatario">Público Destinatario *</label>
            <select
              id="publico_destinatario"
              name="publico_destinatario"
              value={formData.publico_destinatario}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value="">Seleccionar público destinatario</option>
              {opcionesPublico.map(opcion => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="links">Links Relevantes (Opcional)</label>
            <textarea
              id="links"
              name="links"
              value={formData.links}
              onChange={handleChange}
              placeholder="Formulario de inscripción, enlace de streaming, redes sociales..."
              disabled={loading}
              rows="3"
            />
            <small className="field-hint">Separe múltiples links con comas o saltos de línea</small>
          </div>

          <div className="form-group">
            <label htmlFor="observaciones">Observaciones Adicionales (Opcional)</label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              placeholder="Información adicional, requisitos, materiales necesarios..."
              disabled={loading}
              rows="3"
            />
          </div>
        </div>

        {/* SECCIÓN: ARCHIVOS ADJUNTOS */}
        <div className="form-section">
          <h3>📎 Material Complementario</h3>

          <div className="form-group">
            <label htmlFor="archivo_adjunto">Archivos Adjuntos (Opcional)</label>
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
            disabled={loading || !formData.nombre.trim() || !formData.fecha_evento || !formData.categoria_id || !formData.descripcion.trim() || !formData.correo_contacto || !formData.hora_inicio || !formData.hora_fin || !formData.lugar.trim() || !formData.publico_destinatario}
          >
            {loading ? '🔄 Guardando...' : (evento ? '💾 Actualizar Evento' : '✅ Crear Evento')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventoForm;