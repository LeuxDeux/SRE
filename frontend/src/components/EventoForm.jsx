import React, { useState, useEffect } from 'react';
import { eventosAPI, categoriasAPI } from '../services/api';
import '../styles/EventoForm.css';

const EventoForm = ({ evento, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    fecha_evento: '',
    fecha_fin: '',
    descripcion: '',
    categoria_id: '',
    correo_contacto: '',
    telefono: '',
    hora_inicio: '',
    hora_fin: '',
    lugar: '',
    lugarPersonalizado: '',
    publico_destinatario: '',
    publicoDestinatarioPersonalizado: '',
    links: '',
    observaciones: ''
  });

  const [categorias, setCategorias] = useState([]);
  const [archivos, setArchivos] = useState([]); // Array de archivos nuevos a subir
  const [archivosExistentes, setArchivosExistentes] = useState([]); // Archivos ya guardados en BD
  const [archivosAEliminar, setArchivosAEliminar] = useState([]); // IDs de archivos a eliminar
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // ← NUEVO: modal
  const [fieldErrors, setFieldErrors] = useState({});
  const [erroresArchivos, setErroresArchivos] = useState({});

  const validateField = (name, value) => {
    const errors = { ...fieldErrors };

    switch (name) {
      case 'nombre':
        if (!value.trim()) errors.nombre = 'El nombre es requerido';
        else if (value.trim().length < 5) errors.nombre = 'Mínimo 5 caracteres';
        else delete errors.nombre;
        break;

      case 'fecha_evento':
        if (!value) errors.fecha_evento = 'La fecha es requerida';
        else delete errors.fecha_evento;
        break;

      case 'correo_contacto':
        if (value && !/\S+@\S+\.\S+/.test(value)) errors.correo_contacto = 'Correo inválido';
        else delete errors.correo_contacto;
        break;

      case 'descripcion':
        if (!value.trim()) errors.descripcion = 'La descripción es requerida';
        else if (value.trim().length < 10) errors.descripcion = 'Mínimo 10 caracteres';
        else delete errors.descripcion;
        break;

      case 'categoria_id':
        if (!value) errors.categoria_id = 'La categoría es requerida';
        else delete errors.categoria_id;
        break;

      case 'hora_inicio':
        if (!value) errors.hora_inicio = 'La hora de inicio es requerida';
        else delete errors.hora_inicio;
        break;

      case 'hora_fin':
        delete errors.hora_fin;
        break;

      case 'lugar':
        if (!value) errors.lugar = 'El lugar es requerido';
        else delete errors.lugar;
        break;

      case 'publico_destinatario':
        if (!value) errors.publico_destinatario = 'El público destinatario es requerido';
        else delete errors.publico_destinatario;
        break;

      default:
        // Para campos que no necesitan validación especial
        break;
    }

    setFieldErrors(errors);
  };

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
      const fechaFormateada = new Date(evento.fecha_evento).toISOString().split('T')[0];
      const fechaFinFormateada = evento.fecha_fin ? new Date(evento.fecha_fin).toISOString().split('T')[0] : '';

      setFormData({
        nombre: evento.nombre || '',
        fecha_evento: fechaFormateada,
        fecha_fin: fechaFinFormateada,
        descripcion: evento.descripcion || '',
        categoria_id: evento.categoria_id || '',
        correo_contacto: evento.correo_contacto || '',
        telefono: evento.telefono || '',
        hora_inicio: evento.hora_inicio || '',
        hora_fin: evento.hora_fin || '',
        lugar: evento.lugar || '',
        lugarPersonalizado: evento.lugar === 'otro' ? evento.lugar : '',
        publico_destinatario: evento.publico_destinatario || '',
        publicoDestinatarioPersonalizado: evento.publico_destinatario === 'otro' ? evento.publico_destinatario : '',
        links: evento.links || '',
        observaciones: evento.observaciones || ''
      });
      // También cargar la categoría seleccionada si existe
      if (evento.categoria_id && categorias.length > 0) {
        const cat = categorias.find(c => c.id === parseInt(evento.categoria_id));
        setCategoriaSeleccionada(cat);
      }

      // Cargar archivos existentes del evento
      cargarArchivosExistentes(evento.id);
    }
  }, [evento, categorias]);

  // Nueva función para cargar archivos existentes
  const cargarArchivosExistentes = async (eventoId) => {
    try {
      const response = await eventosAPI.obtenerArchivos(eventoId);
      if (response.data.success) {
        setArchivosExistentes(response.data.archivos || []);
      }
    } catch (error) {
      console.error('Error cargando archivos:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    validateField(name, value);
  };

  const handleCategoriaChange = (e) => {
    const categoriaId = e.target.value;
    setFormData(prev => ({ ...prev, categoria_id: categoriaId }));

    const cat = categorias.find(c => c.id === parseInt(categoriaId));
    setCategoriaSeleccionada(cat);

    validateField('categoria_id', categoriaId);
  };

    const calcularFechaMinima = () => {
    const hoy = new Date();
    
    // Siempre habrá categoría seleccionada, pero validar por seguridad
    if (!categoriaSeleccionada || !categoriaSeleccionada.dias_antelacion) {
      return hoy.toISOString().split('T')[0];
    }

    // Si dias_antelacion = 1 → permitir desde hoy (sin sumar días)
    // Si dias_antelacion = 2 → permitir desde mañana (hoy + 1)
    // Si dias_antelacion = 3 → permitir desde pasado mañana (hoy + 2)
    // Fórmula: restar 1 al dias_antelacion
    const diasADelantado = Math.max(0, categoriaSeleccionada.dias_antelacion - 1);
    
    const fechaMin = new Date(hoy);
    fechaMin.setDate(hoy.getDate() + diasADelantado);
    
    return fechaMin.toISOString().split('T')[0];
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const maxFileSize = 50 * 1024 * 1024; // 50MB por archivo
    const maxTotalSize = 250 * 1024 * 1024; // 250MB total
    const maxFiles = 5;
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.rar', '.zip'];
    
    const nuevosErrores = {};
    const archivosValidos = [];
    
    // Validar cantidad total de archivos
    const totalArchivos = archivos.length + archivosExistentes.filter(a => !archivosAEliminar.includes(a.id)).length + files.length;
    if (totalArchivos > maxFiles) {
      setError(`No puedes subir más de ${maxFiles} archivos en total (ya tienes ${archivos.length + archivosExistentes.filter(a => !archivosAEliminar.includes(a.id)).length})`);
      e.target.value = '';
      return;
    }

    // Validar cada archivo
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validar tamaño individual
      if (file.size > maxFileSize) {
        nuevosErrores[i] = `"${file.name}" es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo ${maxFileSize / 1024 / 1024}MB.`;
        continue;
      }
      
      // Validar tipo de archivo
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
        nuevosErrores[i] = `"${file.name}" tiene formato no permitido. Solo ${allowedTypes.join(', ')}.`;
        continue;
      }
      
      archivosValidos.push(file);
    }

    // Validar tamaño total
    const tamañoNuevos = archivosValidos.reduce((sum, f) => sum + f.size, 0);
    const tamañoExistentes = archivosExistentes
      .filter(a => !archivosAEliminar.includes(a.id))
      .reduce((sum, a) => sum + a.tamaño, 0);
    const tamañoTotal = tamañoNuevos + tamañoExistentes;

    if (tamañoTotal > maxTotalSize) {
      setError(`El tamaño total (${(tamañoTotal / 1024 / 1024).toFixed(2)}MB) excede el límite de ${maxTotalSize / 1024 / 1024}MB`);
      e.target.value = '';
      return;
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresArchivos(nuevosErrores);
      // Aún agregar los archivos válidos
    } else {
      setErroresArchivos({});
      setError('');
    }

    // Agregar archivos válidos al estado
    setArchivos([...archivos, ...archivosValidos]);
    e.target.value = ''; // Resetear input
  };

  // Función para eliminar archivo nuevo (no guardado aún)
  const eliminarArchivoNuevo = (index) => {
    setArchivos(archivos.filter((_, i) => i !== index));
    const nuevoErrores = { ...erroresArchivos };
    delete nuevoErrores[index];
    setErroresArchivos(nuevoErrores);
  };

  // Función para marcar archivo existente para eliminar
  const marcarArchivoParaEliminar = (archivoId) => {
    if (archivosAEliminar.includes(archivoId)) {
      setArchivosAEliminar(archivosAEliminar.filter(id => id !== archivoId));
    } else {
      setArchivosAEliminar([...archivosAEliminar, archivoId]);
    }
  };

  // Función para descargar un archivo existente
  const descargarArchivo = async (archivo) => {
    try {
      // Llamar al endpoint con eventoId y archivoId
      const response = await eventosAPI.descargarArchivo(evento.id, archivo.id);
      // El backend devuelve el archivo directamente en res.download()
      // No necesitamos hacer nada más, el navegador lo maneja
    } catch (error) {
      console.error('Error descargando archivo:', error);
      setError('Error al descargar el archivo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación completa antes de enviar
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (!formData.fecha_evento) errors.fecha_evento = 'La fecha es requerida';
    if (!formData.categoria_id) errors.categoria_id = 'La categoría es requerida';
    if (!formData.descripcion.trim()) errors.descripcion = 'La descripción es requerida';
    if (!formData.hora_inicio) errors.hora_inicio = 'La hora de inicio es requerida';
    if (!formData.lugar) errors.lugar = 'El lugar es requerido';
    if (!formData.publico_destinatario) errors.publico_destinatario = 'El público destinatario es requerido';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    if (formData.fecha_fin && formData.fecha_fin < formData.fecha_evento) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    if (formData.lugar === 'otro' && !formData.lugarPersonalizado?.trim()) {
      setError('Por favor especifica el lugar personalizado');
      return;
    }

    if (formData.publico_destinatario === 'otro' && !formData.publicoDestinatarioPersonalizado?.trim()) {
      setError('Por favor especifica el público destinatario');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();

      let lugarFinal = formData.lugar;
      if (formData.lugar === 'otro' && formData.lugarPersonalizado) {
        lugarFinal = formData.lugarPersonalizado;
      } else if (!lugaresPredefinidos.includes(formData.lugar)) {
        // Si el valor no está en la lista predefinida, es un valor personalizado
        lugarFinal = formData.lugar;
      }
      // Procesar público destinatario
      let publicoFinal = formData.publico_destinatario;
      if (formData.publico_destinatario === 'otro' && formData.publicoDestinatarioPersonalizado) {
        publicoFinal = formData.publicoDestinatarioPersonalizado;
      } else if (!opcionesPublico.includes(formData.publico_destinatario)) {
        // Si el valor no está en la lista predefinida, es un valor personalizado
        publicoFinal = formData.publico_destinatario;
      }

      formDataToSend.append('nombre', formData.nombre);
      formDataToSend.append('fecha_evento', formData.fecha_evento);
      if (formData.fecha_fin && formData.fecha_fin.trim()) {
        formDataToSend.append('fecha_fin', formData.fecha_fin);
      }
      formDataToSend.append('descripcion', formData.descripcion);
      formDataToSend.append('categoria_id', formData.categoria_id);
      formDataToSend.append('correo_contacto', formData.correo_contacto);
      formDataToSend.append('telefono', formData.telefono);
      formDataToSend.append('hora_inicio', formData.hora_inicio);
      formDataToSend.append('hora_fin', formData.hora_fin);
      formDataToSend.append('lugar', lugarFinal);
      formDataToSend.append('publico_destinatario', publicoFinal);
      formDataToSend.append('links', formData.links);
      formDataToSend.append('observaciones', formData.observaciones);

      // Agregar archivos nuevos
      if (archivos.length > 0) {
        for (let i = 0; i < archivos.length; i++) {
          formDataToSend.append('archivos_adjuntos', archivos[i]);
        }
      }

      // Agregar IDs de archivos a eliminar (si es edición)
      if (archivosAEliminar.length > 0) {
        formDataToSend.append('archivos_a_eliminar', JSON.stringify(archivosAEliminar));
      }

      let response;

      if (evento) {
        response = await eventosAPI.actualizar(evento.id, formDataToSend);
      } else {
        response = await eventosAPI.crear(formDataToSend);
      }

      if (response.data.success) {
        // Nota: El email se envía automáticamente en el backend al crear/actualizar
        // No necesitamos llamar a enviarPDFCorreo desde aquí para evitar duplicados

        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          onSave(response.data.evento);
        }, 2000);
      }

    } catch (error) {
      console.error('Error guardando evento:', error);
      setError(error.response?.data?.error || 'Error al guardar el evento');
    } finally {
      setLoading(false);
    }
  };

  const opcionesPublico = [
    'Estudiantes',
    'Docentes',
    'Público General',
    'Estudiantes y Docentes',
    'Personal Administrativo',
    'Egresados'
  ];
  const lugaresPredefinidos = [
    'Auditorio',
    'Salón de Extensión 1',
    'Salón de Extensión 2',
    'Bar',
    'Polideportivo'
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

          <div className={`form-group ${fieldErrors.nombre ? 'error' : ''}`}>
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
            {fieldErrors.nombre && <span className="field-error">{fieldErrors.nombre}</span>}
          </div>

          <div className="form-row">
            <div className={`form-group ${fieldErrors.fecha_evento ? 'error' : ''}`}>
              <label htmlFor="fecha_evento">Fecha de Inicio *</label>
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
              {fieldErrors.fecha_evento && <span className="field-error">{fieldErrors.fecha_evento}</span>}
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
              <label htmlFor="fecha_fin">Fecha de Fin (Opcional)</label>
              <input
                type="date"
                id="fecha_fin"
                name="fecha_fin"
                value={formData.fecha_fin}
                onChange={handleChange}
                disabled={loading}
                min={formData.fecha_evento || calcularFechaMinima()}
              />
              <small className="field-hint">
                Solo si el evento dura más de un día
              </small>
            </div>
          </div>

          <div className="form-row">
            <div className={`form-group ${fieldErrors.categoria_id ? 'error' : ''}`}>
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
              {fieldErrors.categoria_id && <span className="field-error">{fieldErrors.categoria_id}</span>}
              {categorias.length === 0 && !loading && (
                <small style={{ color: '#dc3545' }}>
                  No hay categorías disponibles. Contacta al administrador.
                </small>
              )}
            </div>
          </div>

          <div className={`form-group ${fieldErrors.descripcion ? 'error' : ''}`}>
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
            {fieldErrors.descripcion && <span className="field-error">{fieldErrors.descripcion}</span>}
            <small className="field-hint">Máximo 500 caracteres</small>
          </div>
        </div>

        {/* SECCIÓN: DATOS DE CONTACTO */}
        <div className="form-section">
          <h3>📞 Datos de Contacto</h3>

          <div className="form-row">
            <div className={`form-group ${fieldErrors.correo_contacto ? 'error' : ''}`}>
              <label htmlFor="correo_contacto">Correo de Contacto (Opcional)</label>
              <input
                type="email"
                id="correo_contacto"
                name="correo_contacto"
                value={formData.correo_contacto}
                onChange={handleChange}
                placeholder="ejemplo@universidad.edu"
                disabled={loading}
              />
              {fieldErrors.correo_contacto && <span className="field-error">{fieldErrors.correo_contacto}</span>}
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
            <div className={`form-group ${fieldErrors.hora_inicio ? 'error' : ''}`}>
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
              {fieldErrors.hora_inicio && <span className="field-error">{fieldErrors.hora_inicio}</span>}
            </div>

            <div className={`form-group ${fieldErrors.hora_fin ? 'error' : ''}`}>
              <label htmlFor="hora_fin">Hora de Finalización (Opcional)</label>
              <input
                type="time"
                id="hora_fin"
                name="hora_fin"
                value={formData.hora_fin}
                onChange={handleChange}
                disabled={loading}
              />
              {fieldErrors.hora_fin && <span className="field-error">{fieldErrors.hora_fin}</span>}
            </div>
          </div>
          <div className={`form-group ${fieldErrors.lugar ? 'error' : ''}`}>
            <label htmlFor="lugar">Lugar / Espacio *</label>
            <select
              id="lugar"
              name="lugar"
              value={formData.lugar === 'otro' || (formData.lugar !== '' && !lugaresPredefinidos.includes(formData.lugar)) ? 'otro' : formData.lugar}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value="">Seleccionar lugar</option>
              {lugaresPredefinidos.map(lugar => (
                <option key={lugar} value={lugar}>{lugar}</option>
              ))}
              <option value="otro">Otro...</option>
            </select>
            {fieldErrors.lugar && <span className="field-error">{fieldErrors.lugar}</span>}

            {/* Mostrar input personalizado si:
        - Seleccionó "otro" O 
        - El valor actual no está en la lista predefinida (caso edición) */}
            {(formData.lugar === 'otro' || (formData.lugar !== '' && !lugaresPredefinidos.includes(formData.lugar))) && (
              <input
                type="text"
                placeholder="Especificar lugar personalizado"
                value={formData.lugar === 'otro' ? formData.lugarPersonalizado : formData.lugar}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  lugarPersonalizado: e.target.value
                }))}
                disabled={loading}
                required
              />
            )}
          </div>
          {/* SECCIÓN: INFORMACIÓN ADICIONAL */}
          <div className="form-section">
            <h3>🎯 Información Adicional</h3>

            <div className={`form-group ${fieldErrors.publico_destinatario ? 'error' : ''}`}>
              <label htmlFor="publico_destinatario">Público Destinatario *</label>
              <select
                id="publico_destinatario"
                name="publico_destinatario"
                value={formData.publico_destinatario === 'otro' || (formData.publico_destinatario !== '' && !['Estudiantes', 'Docentes', 'Público General', 'Estudiantes y Docentes', 'Personal Administrativo', 'Egresados', 'otro'].includes(formData.publico_destinatario)) ? 'otro' : formData.publico_destinatario}
                onChange={handleChange}
                disabled={loading}
                required
              >
                <option value="">Seleccionar público destinatario</option>
                <option value="Estudiantes">Estudiantes</option>
                <option value="Docentes">Docentes</option>
                <option value="Público General">Público General</option>
                <option value="Estudiantes y Docentes">Estudiantes y Docentes</option>
                <option value="Personal Administrativo">Personal Administrativo</option>
                <option value="Egresados">Egresados</option>
                <option value="otro">Otro...</option>
              </select>
              {fieldErrors.publico_destinatario && <span className="field-error">{fieldErrors.publico_destinatario}</span>}

              {/* Mostrar input personalizado si:
        - Seleccionó "otro" O 
        - El valor actual no está en la lista predefinida (caso edición) */}
              {(formData.publico_destinatario === 'otro' || (formData.publico_destinatario !== '' && !['Estudiantes', 'Docentes', 'Público General', 'Estudiantes y Docentes', 'Personal Administrativo', 'Egresados', 'otro'].includes(formData.publico_destinatario))) && (
                <input
                  type="text"
                  placeholder="Especificar público destinatario personalizado"
                  value={formData.publico_destinatario === 'otro' ? formData.publicoDestinatarioPersonalizado : formData.publico_destinatario}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    publicoDestinatarioPersonalizado: e.target.value
                  }))}
                  disabled={loading}
                  required
                />
              )}
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
        </div>

        {/* SECCIÓN: ARCHIVOS ADJUNTOS */}
        <div className="form-section">
          <h3>📎 Material Complementario</h3>

          <div className="form-group">
            <label htmlFor="archivos_adjuntos">Archivos Adjuntos (Opcional - Máximo 5 archivos, 50MB cada uno, 250MB total)</label>
            <input
              type="file"
              id="archivos_adjuntos"
              onChange={handleFileChange}
              disabled={loading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.rar,.zip"
              multiple
            />
            <small className="file-hint">
              Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, RAR, ZIP (Máximo 50MB cada uno)
            </small>
          </div>

          {/* Mostrar errores de validación de archivos */}
          {Object.values(erroresArchivos).length > 0 && (
            <div className="files-errors">
              {Object.values(erroresArchivos).map((err, idx) => (
                <div key={idx} className="file-error-item">
                  ⚠️ {err}
                </div>
              ))}
            </div>
          )}

          {/* Mostrar archivos existentes (en edición) */}
          {archivosExistentes.length > 0 && (
            <div className="files-section">
              <h4>📂 Archivos Guardados ({archivosExistentes.filter(a => !archivosAEliminar.includes(a.id)).length})</h4>
              <div className="files-list">
                {archivosExistentes.map((archivo) => (
                  <div 
                    key={archivo.id} 
                    className={`file-item ${archivosAEliminar.includes(archivo.id) ? 'markedForDelete' : ''}`}
                  >
                    <div className="file-info-exist">
                      <div className="file-name">📄 {archivo.nombre_archivo}</div>
                      <div className="file-size">
                        {(archivo.tamaño / 1024 / 1024).toFixed(2)} MB • {new Date(archivo.fecha_carga).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        type="button"
                        onClick={() => descargarArchivo(archivo)}
                        className="btn-download"
                        disabled={loading}
                        title="Descargar archivo"
                      >
                        ⬇️
                      </button>
                      <button
                        type="button"
                        onClick={() => marcarArchivoParaEliminar(archivo.id)}
                        className={`btn-delete ${archivosAEliminar.includes(archivo.id) ? 'active' : ''}`}
                        disabled={loading}
                        title={archivosAEliminar.includes(archivo.id) ? 'Deshacer eliminación' : 'Marcar para eliminar'}
                      >
                        {archivosAEliminar.includes(archivo.id) ? '♻️' : '🗑️'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mostrar archivos nuevos seleccionados */}
          {archivos.length > 0 && (
            <div className="files-section">
              <h4>✨ Archivos por Subir ({archivos.length})</h4>
              <div className="files-list">
                {archivos.map((archivo, idx) => (
                  <div key={idx} className="file-item new">
                    <div className="file-info-exist">
                      <div className="file-name">📄 {archivo.name}</div>
                      <div className="file-size">
                        {(archivo.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        type="button"
                        onClick={() => eliminarArchivoNuevo(idx)}
                        className="btn-delete"
                        disabled={loading}
                        title="Eliminar de la selección"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen de tamaño */}
          {(archivos.length > 0 || archivosExistentes.length > 0) && (
            <div className="size-summary">
              <small>
                Tamaño total: {(
                  (archivos.reduce((sum, f) => sum + f.size, 0) +
                   archivosExistentes
                     .filter(a => !archivosAEliminar.includes(a.id))
                     .reduce((sum, a) => sum + a.tamaño, 0)) / 1024 / 1024
                ).toFixed(2)} MB / 250 MB
              </small>
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
            disabled={loading}
          >
            {loading ? '🔄 Guardando...' : (evento ? '💾 Actualizar Evento' : '✅ Crear Evento')}
          </button>
        </div>
      </form>

      {/* MODAL SIMPLE DE ÉXITO */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="modal-icon">✅</div>
            <h3>¡Éxito!</h3>
            <p>Evento {evento ? 'actualizado' : 'creado'} correctamente</p>
            <p className="modal-subtext">Redirigiendo...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventoForm;