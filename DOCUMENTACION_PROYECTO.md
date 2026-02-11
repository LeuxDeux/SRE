# 📅 SRE - Sistema de Reserva de Espacios

**Sistema integral para la gestión de reservas de espacios, recursos y eventos en la UTN Facultad Regional Reconquista**

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Sistema de Emails](#sistema-de-emails)
- [Autenticación](#autenticación)
- [Ejecución](#ejecución)
- [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

SRE es una plataforma web que permite a diferentes secretarías, departamentos y usuarios de la UTN:

- ✅ **Reservar espacios** (aulas, auditorios, laboratorios, etc.)
- ✅ **Asignar recursos** (proyectores, pizarrones, etc.)
- ✅ **Registrar eventos** (congresos, charlas, reuniones, etc.)
- ✅ **Gestionar usuarios y permisos**
- ✅ **Aprobar/rechazar reservas** (con flujo de aprobación opcional)
- ✅ **Notificaciones por email**
- ✅ **Reportes y calendarios**

---

## ✨ Características

### Backend
- 🔐 Autenticación JWT
- 📧 Sistema de emails con SMTP (Reservas y Eventos)
- 📅 Gestión de reservas con validación de disponibilidad
- 🏢 Gestión de espacios, recursos y eventos
- 👥 Control de roles (admin, user, secretary)
- 📊 Datos de auditoría (creador, aprobador, fechas)

### Frontend
- ⚛️ React.js con Hooks
- 📅 Calendario interactivo (React Big Calendar)
- 🎨 UI responsiva y moderna
- 🔔 Notificaciones en tiempo real
- 📱 Funciones para móvil

---

## 🔧 Requisitos

### Software
- **Node.js** 14+ (recomendado: 16+)
- **npm** 6+ o **yarn**
- **MySQL** 5.7+
- **Git**

### Cuenta de Email
- Para envío de notificaciones se requiere:
  - Servidor SMTP configurado (UTN, Gmail u otro)
  - Credenciales válidas

---

## 📦 Instalación

### 1. Clonar el Repositorio
```bash
git clone <url-del-repositorio>
cd SRE\ Workspace
```

### 2. Instalar Dependencias del Backend
```bash
cd backend
npm install
```

### 3. Instalar Dependencias del Frontend
```bash
cd ../frontend
npm install
```

### 4. Crear Base de Datos
```bash
mysql -u root -p < database.sql
```

---

## ⚙️ Configuración

### Variables de Entorno (Backend)

Crear archivo `.env` en la carpeta `backend/`:

```env
# Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=db-sre

# JWT
JWT_SECRET=tu_secreto_muy_seguro_aqui

# Puerto
PORT=5000

# Email Configuration - Opción 1: Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-app
EMAIL_FROM_NAME=SRE Universidad

# Email Configuration - Opción 2: Servidor UTN
# SMTP_HOST=mail.frrq.utn.edu.ar
# SMTP_PORT=587
# SMTP_SECURE=false
# EMAIL_USER=sw.comunicacion@frrq.utn.edu.ar
# EMAIL_PASSWORD=tu_contraseña
# EMAIL_FROM_NAME=SRE Universidad

# Correos receptores (para notificaciones)
CORREO_SECRETARIA_PRINCIPAL=correo@example.com
CORREO_ADICIONAL=otro-correo@example.com
```

### Configuración de Gmail (Recomendado para Pruebas)

1. Ir a https://myaccount.google.com/apppasswords
2. Seleccionar "Mail" y "Windows"
3. Copiar la contraseña generada
4. Usar como `EMAIL_PASSWORD` en `.env`

**Nota:** Requiere autenticación 2FA habilitada

---

## 📁 Estructura del Proyecto

```
SRE Workspace/
├── backend/
│   ├── config/
│   │   └── database.js                 # Configuración de BD
│   ├── controllers/
│   │   ├── authController.js           # Autenticación
│   │   ├── reservasController.js       # ⭐ Gestión de reservas + emails
│   │   ├── espaciosController.js       # Gestión de espacios
│   │   ├── recursosController.js       # Gestión de recursos
│   │   ├── eventosController.js        # ⭐ Gestión de eventos + emails
│   │   ├── usuariosController.js       # Gestión de usuarios
│   │   ├── categoriasController.js     # Categorías
│   │   ├── secretariasController.js    # Secretarías
│   │   └── espaciosRecursosController.js # Asignación E-R
│   ├── middleware/
│   │   ├── auth.js                     # Middleware JWT
│   │   └── upload.js                   # Middleware de archivos
│   ├── routes/                         # Definición de endpoints
│   ├── utils/
│   │   └── emailService.js             # 📧 Servicio centralizado de emails
│   ├── uploads/                        # Almacenamiento de archivos
│   ├── server.js                       # Punto de entrada
│   ├── .env                            # Variables de entorno
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── ReservaForm.jsx         # Formulario de reservas
│   │   │   ├── ReservasCalendar.jsx    # 📅 Calendario principal
│   │   │   ├── EventoForm.jsx          # Formulario de eventos
│   │   │   ├── EventoDetail.jsx
│   │   │   ├── EventosTable.jsx
│   │   │   ├── GestionEspacios.jsx
│   │   │   ├── GestionRecursos.jsx
│   │   │   ├── GestionCategorias.jsx
│   │   │   ├── GestionUsuarios.jsx
│   │   │   ├── AsignarRecursos.jsx
│   │   │   └── TablaGeneralReservas.jsx
│   │   ├── context/
│   │   │   └── AuthContext.js          # Context de autenticación
│   │   ├── services/
│   │   │   └── api.js                  # Cliente HTTP
│   │   ├── styles/
│   │   └── utils/
│   │       └── pdfGenerator.js         # Generador de PDF
│   ├── package.json
│   └── .gitignore
│
├── DOCUMENTACION_PROYECTO.md           # Este archivo
├── IMPLEMENTACION_EMAILS_RESERVAS.md   # Documentación de emails
├── README.md                           # README original
├── PASOS SRE.txt                       # Notas del proyecto
└── package.json
```

---

## 🔌 API Endpoints Principales

### Autenticación
```
POST   /api/auth/login          - Login de usuario
POST   /api/auth/register       - Registro de usuario
GET    /api/auth/me             - Obtener usuario actual
```

### Reservas ⭐
```
GET    /api/reservas            - Obtener todas las reservas
POST   /api/reservas            - Crear nueva reserva (envía email)
GET    /api/reservas/:id        - Obtener detalles de reserva
PUT    /api/reservas/:id        - Actualizar reserva
DELETE /api/reservas/:id        - Cancelar reserva
POST   /api/reservas/:id/aprobar - Aprobar reserva (admin)
POST   /api/reservas/:id/rechazar - Rechazar reserva (admin)
POST   /api/reservas/validar-disponibilidad - Verificar disponibilidad
```

### Eventos ⭐
```
GET    /api/eventos             - Listar eventos
POST   /api/eventos             - Crear evento (envía email con PDF)
GET    /api/eventos/:id         - Obtener detalles
PUT    /api/eventos/:id         - Actualizar evento
DELETE /api/eventos/:id         - Cancelar evento
```

### Espacios
```
GET    /api/espacios            - Listar todos los espacios
POST   /api/espacios            - Crear espacio (admin)
GET    /api/espacios/:id        - Obtener detalles
PUT    /api/espacios/:id        - Actualizar (admin)
DELETE /api/espacios/:id        - Eliminar (admin)
```

### Recursos
```
GET    /api/recursos            - Listar recursos
POST   /api/recursos            - Crear recurso (admin)
```

### Usuarios, Categorías, Secretarías
```
GET    /api/usuarios            - Listar usuarios (admin)
GET    /api/categorias          - Listar categorías
GET    /api/secretarias         - Listar secretarías
```

---

## 📧 Sistema de Emails

### Archivo: `backend/utils/emailService.js`

Proporciona dos funciones principales:

#### `enviarPDFPorCorreo(evento, correosDestino, tipoAccion)`
**Usado en:** Creación y actualización de eventos

**Parámetros:**
- `evento`: Objeto con datos del evento
- `correosDestino`: Array o string de emails
- `tipoAccion`: `'creado'` o `'actualizado'`

**Incluye:** PDF del formulario adjunto

#### `enviarCorreoReserva(reserva, correosDestino, tipoAccion)`
**Usado en:** Creación, aprobación y rechazo de reservas

**Parámetros:**
- `reserva`: Objeto con datos de la reserva
- `correosDestino`: Array o string de emails
- `tipoAccion`: `'creada'`, `'aprobada'`, `'rechazada'`

**Incluye:** Información completa sin PDF

### Configuración Requerida

En `.env` configurar:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-contraseña-app
EMAIL_FROM_NAME=SRE Universidad
```

### Flujo de Emails en Reservas

**Ubicación:** `backend/controllers/reservasController.js`

**1. Crear Reserva (línea ~154)**
```javascript
// ✅ Se envía email SI está confirmada
if (reservaCreada.estado === 'confirmada') {
    const emailDestino = 'yoyoyzacarias2@gmail.com';
    await enviarCorreoReserva(reservaCreada, [emailDestino], 'creada');
}
```
- ✅ Se envía email SI está confirmada
- ❌ NO se envía si está pendiente de aprobación
- Destino: Email configurado manualmente

**2. Aprobar Reserva (línea ~290)**
```javascript
// ⚠️ COMENTADO DE MOMENTO - Descomentar para activar
// await enviarCorreoReserva(reservaAprobada, [email], 'aprobada');
```
- ✅ Se envía email de aprobación (comentado por defecto)
- Destino: Usuario que creó la reserva

**3. Rechazar Reserva (línea ~410)**
```javascript
// ⚠️ COMENTADO DE MOMENTO - Descomentar para activar
// await enviarCorreoReserva(reservaRechazada, [email], 'rechazada');
```
- ✅ Se envía email de rechazo (comentado por defecto)
- Destino: Usuario que creó la reserva

### Flujo de Emails en Eventos

**Ubicación:** `backend/controllers/eventosController.js`

**Crear/Actualizar Evento**
- ✅ Se genera PDF con datos del evento
- ✅ Se envía por email con PDF adjunto
- Destino: Emails configurados
- Tipo: `'creado'` o `'actualizado'`

---

## 🔐 Autenticación

### JWT (JSON Web Tokens)
- Token enviado en header: `Authorization: Bearer <token>`
- Token generado al login
- Se guarda en localStorage en el frontend

### Roles y Permisos
- **admin**: Acceso total, aprueba reservas, gestiona espacios
- **user**: Puede crear reservas y eventos
- **secretary**: Puede gestionar reservas de su secretaría

### Middleware de Autenticación
```javascript
// En auth.js - Verifica JWT válido
const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // Valida y decodifica token
};
```

---

## ▶️ Ejecución

### 1. Iniciar Backend
```bash
cd backend
npm start
# o en modo desarrollo:
npm run dev
```
🔗 Servidor corriendo en: `http://localhost:5000`

### 2. Iniciar Frontend
```bash
cd frontend
npm start
```
🌐 Aplicación abierta en: `http://localhost:3000`

### 3. Verificar Estado
- Backend logs: Muestra conexión DB, SMTP, requests
- Frontend console: Muestra errores y logs de React
- Calendario: Debe mostrar reservas desde la BD

---

## 🐛 Troubleshooting

### ❌ Error: ETIMEDOUT al enviar emails
```
Error: connect ETIMEDOUT 190.114.205.131:587
```

**Causas:**
- Servidor SMTP inaccesible o caído
- Problema de conectividad de red
- Puerto bloqueado por firewall

**Solución:**
```bash
# Verificar conectividad
Test-NetConnection mail.frrq.utn.edu.ar -Port 587

# Si falla, cambiar a Gmail temporalmente en .env
SMTP_HOST=smtp.gmail.com
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=contraseña-app
```

### ❌ Error: Base de datos no encontrada
```
Error: ER_BAD_DB_ERROR: Unknown database 'db-sre'
```

**Solución:**
```bash
mysql -u root -p < database.sql
# O crear manualmente en MySQL Workbench
```

### ❌ CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```

**Verificar:**
- Backend tiene CORS habilitado en `server.js`
- Frontend y backend en puertos correctos (3000 y 5000)

### ❌ Reserva no aparece en calendario
**Checklist:**
- [ ] Reserva está en estado 'confirmada'
- [ ] Fechas en formato ISO (YYYY-MM-DD)
- [ ] Espacio correcto seleccionado
- [ ] Recargar página (F5)

### ❌ Error al crear reserva: "Espacio no disponible"
**Causas:**
- Hay conflicto con otra reserva en esa franja horaria
- Las fechas/horas se solapan

**Solución:**
- Verificar disponibilidad en calendario
- Seleccionar otra franja horaria

---

## 💡 Tips Importantes

### Estados de Reserva
- `pendiente` - Esperando aprobación
- `confirmada` - Activa y válida
- `cancelada` - Cancelada por usuario
- `rechazada` - Rechazada por admin

### Formato de Fechas
- Frontend: `YYYY-MM-DD` (ISO)
- Base de datos: DATE type
- Conversión automática en API

### Emails de Prueba
Para pruebas locales usar:
- Gmail (recomendado y fácil)
- MailTrap (gratis, sandboxed)
- Servidor SMTP local

### Variables de Entorno
**NUNCA** commitear `.env` al repositorio. Usar `.env.example`:
```bash
git add .env.example
git ignore .env
```

---

## 📝 Cambios Recientes

### ✨ Sistema de Emails para Reservas
- **Archivo:** `backend/utils/emailService.js`
- **Nueva función:** `enviarCorreoReserva()`
- **Integración:** En `reservasController.js` (líneas 151-189)
- **Documentación:** Ver `IMPLEMENTACION_EMAILS_RESERVAS.md`

**Características:**
- ✅ Envío a múltiples receptores
- ✅ Diferentes tipos de acción (creada/aprobada/rechazada)
- ✅ HTML con diseño profesional
- ✅ No interrumpe operación si falla email
- ✅ Solo envía cuando reserva está confirmada (de momento)

---

## 📞 Soporte

Para reportar bugs:
1. Revisar sección Troubleshooting
2. Verificar logs en consola (backend y frontend)
3. Verificar `.env` configurado correctamente
4. Crear issue en el repositorio si es necesario

---

## 📜 Información del Proyecto

- **Versión:** 1.0.0
- **Última actualización:** Diciembre 2025
- **Institución:** UTN Facultad Regional Reconquista
- **Propósito:** Gestión de espacios, recursos y eventos universitarios

---

**¡Listo para desarrollar! 🚀**
