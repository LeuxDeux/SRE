import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { reservasAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GestionEspacios from './GestionEspacios.jsx';
import '../styles/ReservasCalendar.css';
import GestionRecursos from './GestionRecursos';
import AsignarRecursos from './AsignarRecursos';
import ReservaForm from './ReservaForm.jsx';
import TablaGeneralReservas from './TablaGeneralReservas';

// Configurar moment en español
moment.locale('es');
const localizer = momentLocalizer(moment);

// Componente personalizado para eventos
const CustomEvent = ({ event, view }) => (
  <div style={{
    fontSize: view === 'month' ? '10px' : '11px',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }}>
    <strong>{event.title.split(' - ')[0]}</strong>
    <br />
    <small>
      {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
    </small>
    {view === 'month' && (
      <br />
    )}
    {view === 'month' && (
      <small style={{ opacity: 0.8 }}>
        {event.resource.espacio_nombre}
      </small>
    )}
  </div>
);

// Componente personalizado para el toolbar en español
const CustomToolbar = ({ label, onNavigate, onView, view }) => {
  const formatLabel = (label) => {
    const months = {
      'January': 'Enero', 'February': 'Febrero', 'March': 'Marzo', 'April': 'Abril',
      'May': 'Mayo', 'June': 'Junio', 'July': 'Julio', 'August': 'Agosto',
      'September': 'Septiembre', 'October': 'Octubre', 'November': 'Noviembre', 'December': 'Diciembre'
    };

    const days = {
      'Sunday': 'Domingo', 'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
      'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado'
    };

    let formattedLabel = label;

    Object.keys(days).forEach(engDay => {
      formattedLabel = formattedLabel.replace(engDay, days[engDay]);
    });

    Object.keys(months).forEach(engMonth => {
      formattedLabel = formattedLabel.replace(engMonth, months[engMonth]);
    });

    return formattedLabel;
  };

  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('PREV')}>
          ‹ Anterior
        </button>
        <button type="button" onClick={() => onNavigate('TODAY')}>
          Hoy
        </button>
        <button type="button" onClick={() => onNavigate('NEXT')}>
          Siguiente ›
        </button>
      </span>

      <span className="rbc-toolbar-label" style={{
        fontWeight: 'bold',
        fontSize: '16px',
        textTransform: 'capitalize'
      }}>
        {formatLabel(label)}
      </span>

      <span className="rbc-btn-group">
        <button
          type="button"
          className={view === 'month' ? 'rbc-active' : ''}
          onClick={() => onView('month')}
        >
          Mes
        </button>
        <button
          type="button"
          className={view === 'week' ? 'rbc-active' : ''}
          onClick={() => onView('week')}
        >
          Semana
        </button>
        <button
          type="button"
          className={view === 'day' ? 'rbc-active' : ''}
          onClick={() => onView('day')}
        >
          Día
        </button>
      </span>
    </div>
  );
};

const CustomWeekHeader = ({ date, localizer, label }) => {
  const dayName = moment(date).format('dddd');
  const dayNumber = moment(date).format('D');
  const dayShort = moment(date).format('dd');

  const dayAbbreviations = {
    'Su': 'Do', 'Mo': 'Lu', 'Tu': 'Ma', 'We': 'Mi',
    'Th': 'Ju', 'Fr': 'Vi', 'Sa': 'Sá'
  };

  const formattedDayShort = dayAbbreviations[dayShort] || dayShort;

  return (
    <div style={{
      textAlign: 'center',
      padding: '8px 4px',
      fontWeight: 'bold',
      fontSize: '12px',
      borderBottom: '2px solid #3498db'
    }}>
      <div style={{
        textTransform: 'capitalize',
        fontSize: '11px',
        color: '#7f8c8d',
        marginBottom: '2px'
      }}>
        {formattedDayShort}
      </div>
      <div style={{
        fontSize: '16px',
        color: moment(date).isSame(new Date(), 'day') ? '#e74c3c' : '#2c3e50',
        fontWeight: 'bold'
      }}>
        {dayNumber}
      </div>
      <div style={{
        fontSize: '10px',
        color: '#95a5a6',
        textTransform: 'capitalize',
        marginTop: '2px'
      }}>
        {dayName}
      </div>
    </div>
  );
};

const CustomMonthHeader = ({ date, localizer, label }) => {
  const dayName = moment(date).format('dddd');
  const dayNumber = moment(date).format('D');

  const dayAbbreviations = {
    'Sunday': 'Dom', 'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié',
    'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb'
  };

  const formattedDayName = dayAbbreviations[dayName] || dayName;

  return (
    <div style={{
      textAlign: 'center',
      padding: '4px 2px',
      fontWeight: 'bold',
      fontSize: '11px'
    }}>
      <div style={{
        color: '#ffffffff',
        marginBottom: '1px'
      }}>
        {formattedDayName}
      </div>
      <div style={{
        fontSize: '14px',
        color: moment(date).isSame(new Date(), 'day') ? '#e74c3c' : '#fff'
      }}>
        {dayNumber}
      </div>
    </div>
  );
};

const ReservasCalendar = () => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showMoreEvents, setShowMoreEvents] = useState([]);
  const [currentView, setCurrentView] = useState('week');
  const { user } = useAuth();
  const [vistaActual, setVistaActual] = useState('calendario'); // 'calendario', 'espacios', 'recursos', 'asignar'
  const [showReservaForm, setShowReservaForm] = useState(false);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);

  // Cargar reservas al montar el componente
  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      setLoading(true);
      const response = await reservasAPI.obtenerTodas();

      console.log('📊 Respuesta de la API:', response);
      console.log('📦 Datos de reservas:', response.data);

      const eventos = response.data.map(reserva => {
        console.log('📅 Procesando reserva:', reserva);

        const fechaInicioSolo = reserva.fecha_inicio.split('T')[0];
        const fechaFinSolo = reserva.fecha_fin.split('T')[0];

        const startDate = new Date(fechaInicioSolo + 'T' + reserva.hora_inicio);
        const endDate = new Date(fechaFinSolo + 'T' + reserva.hora_fin);

        console.log('🕐 Fechas convertidas:', {
          fecha_inicio: reserva.fecha_inicio,
          fecha_solo: fechaInicioSolo,
          hora_inicio: reserva.hora_inicio,
          startDate: startDate,
          endDate: endDate
        });

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('❌ Fecha inválida para reserva:', reserva.id);
          return null;
        }

        return {
          id: reserva.id,
          title: `${reserva.titulo} - ${reserva.espacio_nombre}`,
          start: startDate,
          end: endDate,
          resource: reserva,
        };
      }).filter(evento => evento !== null);

      console.log('🎯 Eventos finales para calendario:', eventos);
      setReservas(eventos);
      setError(null);
    } catch (err) {
      console.error('❌ Error cargando reservas:', err);
      setError('Error al cargar las reservas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (newDate) => {
    console.log('📍 Navegando a:', newDate);
    setDate(newDate);
  };

  const handleView = (newView) => {
    console.log('👀 Cambiando vista a:', newView);
    setCurrentView(newView);
  };

  const handleSelectEvent = (event) => {
    console.log('🎯 Evento seleccionado:', event);
    setSelectedEvent(event);
  };

  const handleSelectSlot = (slotInfo) => {
    console.log('📅 Slot seleccionado:', slotInfo);
    alert(`Crear reserva para: ${slotInfo.start.toLocaleDateString()} ${moment(slotInfo.start).format('HH:mm')}`);
  };

  const handleShowMore = (events, date) => {
    console.log('📈 Eventos para', date, ':', events);
    setShowMoreEvents(events);
  };

  const renderVista = () => {
    switch (vistaActual) {
      case 'calendario':
        return (
          <>
            <Calendar
              localizer={localizer}
              events={reservas}
              startAccessor="start"
              endAccessor="end"
              style={{ minHeight: '600px' }}
              views={['month', 'week', 'day']}
              view={currentView}
              date={date}
              onNavigate={handleNavigate}
              onView={handleView}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onShowMore={handleShowMore}
              selectable={true}
              showMultiDayTimes={true}
              step={30}
              timeslots={2}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: '#3498db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  padding: '2px 4px',
                },
              })}
              components={{
                event: (props) => <CustomEvent {...props} view={currentView} />,
                toolbar: CustomToolbar,
                month: { header: CustomMonthHeader },
                week: { header: CustomWeekHeader },
                day: { header: CustomWeekHeader },
              }}
              messages={{
                next: "Siguiente", previous: "Anterior", today: "Hoy",
                month: "Mes", week: "Semana", day: "Día", agenda: "Agenda",
                date: "Fecha", time: "Hora", event: "Reserva",
                noEventsInRange: "No hay reservas en este período",
                showMore: total => `+${total} más`
              }}
            />

            {/* PANEL DE ADMINISTRACIÓN */}
            {user.role === 'admin' && (
              <div className="admin-panel" style={{
                marginTop: '20px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4>🔧 Panel de Administración</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setVistaActual('espacios')}
                    className="btn-admin"
                    style={{
                      padding: '10px 15px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🏢 Gestionar Espacios
                  </button>
                  <button
                    onClick={() => setVistaActual('recursos')}
                    className="btn-admin"
                    style={{
                      padding: '10px 15px',
                      background: '#2ecc71',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🎛️ Gestionar Recursos
                  </button>
                  <button
                    onClick={() => setVistaActual('asignar')}
                    className="btn-admin"
                    style={{
                      padding: '10px 15px',
                      background: '#e67e22',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🔗 Asignar Recursos
                  </button>
                </div>
              </div>
            )}
          </>
        );

      case 'espacios':
        return <GestionEspacios onVolver={() => setVistaActual('calendario')} />;

      case 'recursos':
        return <GestionRecursos onVolver={() => setVistaActual('calendario')} />;

      case 'asignar':
        return <AsignarRecursos onVolver={() => setVistaActual('calendario')} />;

      default:
        return <div>Vista no encontrada</div>;
    }
  };

  if (loading) {
    return <div className="loading">Cargando calendario...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="reservas-calendar">
      {/* ENCABEZADO PRINCIPAL */}
      {vistaActual === 'calendario' ? (
        <>
          <h2>📅 Calendario de Reservas</h2>
          <button 
            onClick={() => setShowReservaForm(true)}
            style={{
                background: 'linear-gradient(135deg, #27ae60, #219a52)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px'
            }}
        >
            🏢 Reservar Espacio
        </button>
        
        <div style={{background: '#e8f4fd', padding: '8px 12px', borderRadius: '4px', marginBottom: '10px'}}></div>
          <div style={{
            background: '#e8f4fd',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '10px',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              <strong>Vista actual:</strong>
              <span style={{
                color: currentView === 'month' ? '#e74c3c' :
                  currentView === 'week' ? '#27ae60' : '#3498db',
                fontWeight: 'bold',
                marginLeft: '5px'
              }}>
                {currentView === 'month' ? 'Mensual' :
                  currentView === 'week' ? 'Semanal' : 'Diaria'}
              </span>
            </span>
            <small style={{ color: '#666' }}>
              Usa los botones arriba a la derecha para cambiar vista
            </small>
          </div>
        </>
      ) : (
        <div className="modulo-header">
          <button
            onClick={() => setVistaActual('calendario')}
            className="btn-volver"
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '15px'
            }}
          >
            ← Volver al Calendario
          </button>
          <h2>
            {vistaActual === 'espacios' && '🏢 Gestión de Espacios'}
            {vistaActual === 'recursos' && '🎛️ Gestión de Recursos'}
            {vistaActual === 'asignar' && '🔗 Asignar Recursos a Espacios'}
          </h2>
        </div>
      )}

      {renderVista()}

      {/* MODALES (solo se muestran en vista calendario) */}
      {vistaActual === 'calendario' && (
        <>
          {/* MODAL DETALLES EVENTO */}
          {selectedEvent && (
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              zIndex: 1000, minWidth: '300px'
            }}>
              <h3>📋 Detalles de la Reserva</h3>
              <p><strong>Título:</strong> {selectedEvent.resource.titulo}</p>
              <p><strong>Espacio:</strong> {selectedEvent.resource.espacio_nombre}</p>
              <p><strong>Fecha:</strong> {selectedEvent.start.toLocaleDateString()}</p>
              <p><strong>Hora:</strong> {moment(selectedEvent.start).format('HH:mm')} - {moment(selectedEvent.end).format('HH:mm')}</p>
              <p><strong>Estado:</strong>
                <span style={{
                  color: selectedEvent.resource.estado === 'confirmada' ? '#27ae60' :
                    selectedEvent.resource.estado === 'pendiente' ? '#f39c12' : '#e74c3c',
                  fontWeight: 'bold', marginLeft: '5px'
                }}>
                  {selectedEvent.resource.estado}
                </span>
              </p>
              <p><strong>Solicitante:</strong> {selectedEvent.resource.usuario_nombre}</p>
              {selectedEvent.resource.descripcion && (
                <p><strong>Descripción:</strong> {selectedEvent.resource.descripcion}</p>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  marginTop: '15px', padding: '8px 16px', background: '#e74c3c',
                  color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          )}

          {/* MODAL VER TODOS EVENTOS */}
          {showMoreEvents.length > 0 && (
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              zIndex: 1000, minWidth: '400px', maxHeight: '80vh', overflowY: 'auto'
            }}>
              <h3>📅 Eventos del {showMoreEvents[0].start.toLocaleDateString()}</h3>
              {showMoreEvents.map((event, index) => (
                <div key={index} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '10px', margin: '5px 0', background: '#f9f9f9' }}>
                  <p><strong>{event.resource.titulo}</strong></p>
                  <p><small>🕐 {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}</small></p>
                  <p><small>🏢 {event.resource.espacio_nombre}</small></p>
                  <p><small>👤 {event.resource.usuario_nombre}</small></p>
                  <button
                    onClick={() => { setSelectedEvent(event); setShowMoreEvents([]); }}
                    style={{ padding: '4px 8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}
                  >
                    Ver detalles
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowMoreEvents([])}
                style={{ marginTop: '15px', padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          )}

          {/* OVERLAY MODALES */}
          {(selectedEvent || showMoreEvents.length > 0) && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 999
            }} onClick={() => { setSelectedEvent(null); setShowMoreEvents([]); }} />
          )}

          {showReservaForm && (
            <ReservaForm
              slotInicial={slotSeleccionado}
              onClose={() => {
                setShowReservaForm(false);
                setSlotSeleccionado(null);
              }}
              onReservaCreada={(reserva) => {
                setShowReservaForm(false);
                setSlotSeleccionado(null);
                cargarReservas(); // Recargar calendario
                // Opcional: mostrar mensaje de éxito
                alert(`Reserva ${reserva.numero_reserva} creada exitosamente!`);
              }}
            />
          )}

        </>
      )}
    </div>
  );
};

export default ReservasCalendar;