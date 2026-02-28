# Implementación: Emails Vinculados a Espacios en Reservas

## Descripción General
Se implementó un sistema para vincular múltiples correos electrónicos a los espacios. Cuando se crea, edita, aprueba o cancela una reserva, los correos vinculados al espacio reciben notificaciones automáticamente.

## Cambios Realizados

### 1. Base de Datos
- **Nueva tabla**: `espacios_emails`
  - `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
  - `espacio_id` (INT, FOREIGN KEY → espacios.id, ON DELETE CASCADE)
  - `email` (VARCHAR(255))
  - `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
  - Constraint UNIQUE: `espacio_id + email`
  - Archivo migración: [crear_tabla_espacios_emails.sql](migrations/crear_tabla_espacios_emails.sql)

### 2. Control de Espacios ([espaciosController.js](backend/controllers/espaciosController.js))

#### Método: `obtenerEspacios()`
- Ahora trae los emails vinculados con GROUP_CONCAT
- Transforma `emails_list` en un array `emails`

#### Método: `obtenerEspacioPorId()`
- Similar a `obtenerEspacios()` pero para un espacio específico
- Retorna `emails` como array

#### Método: `crearEspacio()`
- Ahora recibe parámetro `emails` (array opcional)
- Filtra emails vacíos/duplicados
- Inserta los emails en `espacios_emails`

#### Método: `actualizarEspacio()`
- Recibe parámetro `emails` (array opcional)
- Elimina los emails viejos
- Inserta los nuevos emails

### 3. Control de Reservas ([reservasController.js](backend/controllers/reservasController.js))

#### Método: `crearReserva()`
- **Nueva lógica de emails**:
  1. Obtiene emails del .env (CORREOS_NOTIFICACION_RESERVA)
  2. Obtiene emails del espacio desde `espacios_emails`
  3. Agrega email del usuario (si está habilitado)
  4. Elimina duplicados
  5. Envía correo a todos los destinatarios

#### Método: `aprobarReserva()`
- Misma lógica de recopilación de emails que en `crearReserva()`
- Incluye emails del espacio al enviar correo de aprobación

#### Método: `actualizar()` (editar reserva)
- Incluye emails del espacio en la construcción de destinatarios
- Envía correo de edición a espacios vinculados

#### Método: `cancelarReserva()`
- Incluye emails del espacio en la lista de destinatarios
- Notifica al espacio sobre cancelación

## Flujo de Prueba

### Crear un Espacio con Emails
```javascript
POST /api/espacios
{
  "nombre": "Auditorio Principal",
  "descripcion": "Auditorio con capacidad para 200 personas",
  "capacidad": 200,
  "ubicacion": "Edificio Central",
  "estado": "disponible",
  "requiere_aprobacion": true,
  "emails": ["auditorio@universidad.edu", "mantenimiento@universidad.edu"]
}
```

### Editar un Espacio y Cambiar Emails
```javascript
PUT /api/espacios/{id}
{
  "nombre": "Auditorio Principal",
  "emails": ["nuevo-email@universidad.edu"]
}
```

### Crear una Reserva
- Se enviarán correos a:
  - Emails del espacio (de la tabla `espacios_emails`)
  - Emails del .env (CORREOS_NOTIFICACION_RESERVA)
  - Email del usuario (si INCLUIR_EMAIL_USUARIO_EN_NOTIFICACION=true)

### Aprobar una Reserva
- Se enviarán notificaciones a los mismos destinatarios

### Cancelar una Reserva
- Se enviarán notificaciones a:
  - Email del usuario solicitante
  - Emails de participantes
  - **Emails del espacio** (nuevo)
  - Emails del .env

## Notas Importantes

1. **Duplicados**: Se eliminan automáticamente usando `Set` antes de enviar correos
2. **Migración**: Usuario debe ejecutar manualmente el archivo SQL de migración
3. **Compatibilidad**: Total compatibilidad con el sistema existente de categorías
4. **Logging**: Todos los errores se registran pero no interrumpen el proceso

## Tablas Relacionadas

```
espacios
├── espacios_emails (NEW)
├── espacios_recursos
├── reservas
└── secretarias
```

## Archivos Modificados

1. [espaciosController.js](backend/controllers/espaciosController.js)
   - Métodos: obtenerEspacios, obtenerEspacioPorId, crearEspacio, actualizarEspacio

2. [reservasController.js](backend/controllers/reservasController.js)
   - Métodos: crearReserva, aprobarReserva, actualizar, cancelarReserva

3. [crear_tabla_espacios_emails.sql](migrations/crear_tabla_espacios_emails.sql)
   - Nueva tabla para almacenar emails de espacios
