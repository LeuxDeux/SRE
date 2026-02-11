# 📧 Implementación de Envío de Emails para Reservas

## 📋 Resumen
Se ha implementado un sistema completo de notificación por correo electrónico para las reservas de espacios, similar al sistema existente para eventos pero sin PDF. El sistema incluye notificación de recursos solicitados.

---

## 🔧 Cambios Realizados

### 1. **emailService.js** - Nueva función `enviarCorreoReserva()`

Se agregó una nueva función que envía correos de notificación para reservas:

```javascript
const enviarCorreoReserva = async (reserva, correosDestino, tipoAccion = 'creada')
```

**Parámetros:**
- `reserva` (Object): Objeto con datos de la reserva (incluye array de recursos)
- `correosDestino` (Array|String): Email(s) a los que se envía el correo
- `tipoAccion` (String): Tipo de acción - `'creada'`, `'aprobada'`, o `'rechazada'`

**Características:**
- ✅ Soporta múltiples receptores (array de correos)
- 🎨 HTML con diseño profesional con colores según estado
- 📅 Formatea fechas y horas automáticamente
- ⏳ Muestra estado de la reserva (Pendiente/Confirmada/Rechazada)
- 📝 Incluye descripción, observaciones y datos del solicitante
- 🎛️ **NUEVO:** Muestra los recursos solicitados con cantidades
- ⚠️ Maneja errores sin interrumpir el flujo

---

### 2. **reservasController.js** - Integración de Emails y Recursos

#### **A. crearReserva()**
Cuando se crea una reserva:
1. Se crea la reserva normalmente
2. **NUEVO:** Se guardan los recursos en tabla `reservas_recursos` si los hay
3. Se obtienen los datos completos incluyendo recursos
4. Se envía correo con tipo `'creada'` (solo si está confirmada)

```javascript
// Guardar recursos asociados
if (req.body.recursos_solicitados && Array.isArray(req.body.recursos_solicitados)) {
    const recursosSolicitados = req.body.recursos_solicitados.filter(r => r.cantidad_solicitada > 0);
    
    for (const recurso of recursosSolicitados) {
        await db.execute(
            `INSERT INTO reservas_recursos 
            (reserva_id, recurso_id, cantidad_solicitada, observaciones)
            VALUES (?, ?, ?, ?)`,
            [result.insertId, recurso.recurso_id, recurso.cantidad_solicitada, recurso.observaciones || null]
        );
    }
}

// Obtener recursos para el correo
const [recursos] = await db.execute(
    `SELECT rr.id, rr.cantidad_solicitada, rr.observaciones,
            r.nombre as recurso_nombre
    FROM reservas_recursos rr
    LEFT JOIN recursos r ON rr.recurso_id = r.id
    WHERE rr.reserva_id = ?`,
    [result.insertId]
);
reservaCreada.recursos = recursos || [];
```

#### **B. aprobarReserva()**
Cuando un admin aprueba una reserva pendiente:
1. Se aprueba la reserva (UPDATE)
2. Se obtienen datos completos de la reserva **incluyendo recursos**
3. Se envía correo al usuario con tipo `'aprobada'`

```javascript
// Obtener recursos para el correo
const [recursos] = await db.execute(
    `SELECT rr.id, rr.cantidad_solicitada, rr.observaciones,
            r.nombre as recurso_nombre
    FROM reservas_recursos rr
    LEFT JOIN recursos r ON rr.recurso_id = r.id
    WHERE rr.reserva_id = ?`,
    [id]
);
reservaAprobada.recursos = recursos || [];
```

#### **C. rechazarReserva()**
Cuando un admin rechaza una reserva pendiente:
1. Se rechaza la reserva (UPDATE)
2. Se obtienen datos completos de la reserva (comentado por defecto)
3. Se envía correo al usuario con tipo `'rechazada'` (comentado)

---

## 📊 Estructura del Correo

El correo incluye las siguientes secciones:

### Encabezado
- Título dinámico según tipo de acción (✅ Creada / 🎉 Aprobada / ❌ Rechazada)
- Descripción clara del evento

### Tarjeta de Información Principal
- 📍 Espacio (nombre)
- 📅 Fecha (rango si es multi-día)
- 🕐 Hora (inicio - fin)
- 📌 Número de reserva
- Estado con color dinámico

### **🎛️ Sección de Recursos** (NUEVO)
- Muestra lista de recursos solicitados
- Cantidad de cada recurso
- Observaciones si las hay
- Si no hay recursos: Muestra "No hay recursos asociados a esta reserva"

**Ejemplo en el correo:**
```
🎛️ Recursos solicitados:
  • Proyector - Cantidad: 1 (en buen estado)
  • Pizarrón - Cantidad: 2
  • Micrófono - Cantidad: 1
```

### Información del Solicitante
- 👤 Nombre completo
- 📧 Email
- 📞 Teléfono

### Información Adicional
- 📝 Descripción (si existe)
- 💬 Observaciones (si existen)
- ⏳ Estado de aprobación (si está pendiente)
- ✓ Nombre del aprobador (si fue aprobada)

### Pie de Página
- Nota de sistema automático
- Instrucción de no responder

---

## 🎯 Flujo de Envío

### Caso 1: Espacio SIN Aprobación Requerida
```
Usuario crea reserva CON recursos
    ↓
1. Se insertan recursos en tabla reservas_recursos
    ↓
2. Reserva se confirma automáticamente (estado = 'confirmada')
    ↓
3. Se obtienen los recursos
    ↓
4. Correo 'creada' se envía con lista de recursos
```

### Caso 2: Espacio CON Aprobación Requerida
```
Usuario crea reserva CON recursos
    ↓
1. Se insertan recursos en tabla reservas_recursos
    ↓
2. Reserva queda pendiente (estado = 'pendiente')
    ↓
3. ❌ NO se envía correo (está pendiente)
    ↓
(Más tarde) Admin aprueba la reserva
    ↓
1. Se obtienen los recursos guardados
    ↓
2. Correo 'aprobada' se envía con lista de recursos
```

### Caso 3: Rechazo de Reserva (Deshabilitado)
```
Usuario crea reserva pendiente
    ↓
Admin rechaza la reserva
    ↓
❌ Correo NO se envía (deshabilitado por defecto)
```

---

## 📨 Receptores por Acción

| Acción | Receptores | Recursos Incluidos |
|--------|-----------|-------------------|
| **Crear (confirmada)** | Email configurable en código | ✅ Sí |
| **Crear (pendiente)** | ❌ No se envía | - |
| **Aprobar** | Email configurable en código | ✅ Sí |
| **Rechazar** | ❌ No se envía (deshabilitado) | - |

---

## 💾 Almacenamiento de Recursos

### Tabla: `reservas_recursos`
```sql
CREATE TABLE reservas_recursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reserva_id INT NOT NULL,
    recurso_id INT NOT NULL,
    cantidad_solicitada INT NOT NULL,
    observaciones VARCHAR(255),
    FOREIGN KEY (reserva_id) REFERENCES reservas(id),
    FOREIGN KEY (recurso_id) REFERENCES recursos(id)
);
```

### Flujo de Almacenamiento
1. Frontend envía `recursos_solicitados` en el request de creación
2. Backend filtra recursos con `cantidad_solicitada > 0`
3. Para cada recurso, inserta un registro en `reservas_recursos`
4. Si hay error en un recurso, continúa con los demás (no interrumpe)

---

## 🛡️ Manejo de Errores

Los errores de envío de email **NO interrumpen** la operación:

```javascript
try {
    await enviarCorreoReserva(...);
} catch (emailError) {
    console.error('⚠️ Error enviando correo:', emailError.message);
    // La reserva se crea/aprueba igual
}
```

Los errores al guardar recursos **NO interrumpen** la creación de la reserva:

```javascript
for (const recurso of recursosSolicitados) {
    try {
        await db.execute(...);
    } catch (recursoError) {
        console.error(`⚠️ Error guardando recurso:`, recursoError.message);
        // Continúa con el siguiente recurso
    }
}
```

Esto asegura que:
- ✅ La reserva se procesa correctamente
- ✅ Los recursos se guardan si es posible
- ✅ El correo se envía si es posible
- ⚠️ Se registran errores en console
- ✅ Se retorna respuesta exitosa al cliente

---

## 🔌 Variables de Entorno Requeridas

Asegúrate de que `.env` tenga:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-app
EMAIL_FROM_NAME=Sistema SRE
```

---

## 📝 Datos Disponibles en el Correo

El objeto `reserva` que se envía contiene:

```javascript
{
  id,
  numero_reserva,
  titulo,
  descripcion,
  observaciones,
  fecha_inicio,
  hora_inicio,
  fecha_fin,
  hora_fin,
  estado,
  espacio_nombre,
  usuario_nombre,
  usuario_email,
  usuario_telefono,
  aprobador_nombre,
  recursos: [                    // NUEVO
    {
      id,
      recurso_nombre,
      cantidad_solicitada,
      observaciones
    },
    ...
  ]
}
```

---

## 🔍 Ejemplos de Uso

### Enviar a un solo email:
```javascript
await enviarCorreoReserva(reserva, 'usuario@example.com', 'creada');
```

### Enviar a múltiples emails:
```javascript
const emails = ['usuario@example.com', 'participante1@example.com'];
await enviarCorreoReserva(reserva, emails, 'creada');
```

### Enviar notificación de aprobación (con recursos):
```javascript
await enviarCorreoReserva(reserva, reserva.usuario_email, 'aprobada');
```

---

## 🎨 Colores por Estado

- **Creada:** Verde (#27ae60)
- **Aprobada:** Azul (#2980b9)
- **Rechazada:** Rojo (#e74c3c)
- **Pendiente:** Naranja (#f39c12)

---

## ✅ Checklist de Implementación

- [x] Función `enviarCorreoReserva()` creada en emailService.js
- [x] Import de `enviarCorreoReserva` en reservasController.js
- [x] Integración en `crearReserva()`
- [x] Integración en `aprobarReserva()`
- [x] Integración en `rechazarReserva()` (deshabilitada)
- [x] Manejo de errores sin interrupciones
- [x] **NUEVO:** Guardado de recursos en tabla `reservas_recursos`
- [x] **NUEVO:** Obtención de recursos del backend
- [x] **NUEVO:** Visualización de recursos en HTML del correo
- [x] Documentación completa

---

## 🚀 Próximos Pasos Opcionales

1. ✅ **Incluir recursos solicitados:** Mostrar lista de recursos en el correo
2. **Admin notificación:** Enviar correo a admin cuando hay nueva reserva pendiente
3. **Recordatorio previo:** Enviar recordatorio 24hs antes de la reserva
4. **Edición de reserva:** Notificar cambios si se modifica una reserva
5. **Cancelación:** Notificar cuando se cancela una reserva

---

**Última actualización:** Diciembre 2025
**Implementado:** Diciembre 2025
**Sistema:** SRE - Sistema de Reserva de Espacios
