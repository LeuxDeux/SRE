const nodemailer = require('nodemailer');
const { jsPDF } = require('jspdf');

// Configurar transportador SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Genera un PDF en formato Buffer (sin guardar archivo)
 * @param {Object} evento - Datos del evento
 * @returns {Promise<Buffer>} Buffer del PDF
 */
const generarPDFBuffer = async (evento) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 25;
      let yPosition = 25;

      // ===== ENCABEZADO INSTITUCIONAL =====
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      
      doc.text('Formulario de Solicitud de Comunicación – UTN', margin + 12, yPosition);
      
      yPosition += 8;
      doc.setFontSize(14);
      doc.text('Facultad Regional Reconquista', margin + 12, yPosition);

      yPosition += 20;

      // ===== SECCIÓN: DATOS INSTITUCIONALES =====
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      doc.rect(margin + 7, yPosition - 4, 6, 6, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Datos institucionales', margin + 16, yPosition);

      yPosition += 15;

      const datosInstitucionales = [
        { label: 'Secretaría / Área solicitante: ', value: evento.secretaria },
        { label: 'Responsable de la solicitud: ', value: evento.usuario_nombre },
        { label: 'Correo de contacto: ', value: evento.correo_contacto },
        { label: 'Teléfono (opcional): ', value: evento.telefono }
      ];

      datosInstitucionales.forEach(dato => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 25;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(dato.label, margin, yPosition);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const labelWidth = doc.getTextWidth(dato.label);

        const lineStartX = margin + labelWidth;
        const lineLength = pageWidth - margin - lineStartX - 5;

        if (dato.value && dato.value !== '______') {
          doc.text(dato.value, lineStartX + 2, yPosition);
        } else {
          doc.line(lineStartX, yPosition - 3, lineStartX + lineLength, yPosition - 3);
        }

        doc.setFontSize(12);
        yPosition += 10;
      });

      yPosition += 15;

      // ===== SECCIÓN: DATOS DEL EVENTO =====
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos del evento', margin + 12, yPosition);
      
      yPosition += 15;

      const fechaEvento = evento.fecha_evento ?
        (evento.fecha_fin && evento.fecha_fin !== evento.fecha_evento
          ? `${new Date(evento.fecha_evento).toLocaleDateString('es-ES')} al ${new Date(evento.fecha_fin).toLocaleDateString('es-ES')}`
          : new Date(evento.fecha_evento).toLocaleDateString('es-ES')
        ) : '______';

      const datosEvento = [
        { label: 'Título del evento: ', value: evento.nombre, multiline: false },
        { 
          label: 'Tipo de evento (congreso / charla / curso / reunión / cultural / otro): ', 
          value: evento.categoria_nombre, 
          multiline: true 
        },
        { 
          label: 'Descripción breve (3–5 líneas): ', 
          value: evento.descripcion, 
          multiline: true,
          large: true 
        },
        { label: 'Fecha de realización: ', value: fechaEvento, multiline: false },
        { 
          label: 'Hora de inicio: ', 
          value: evento.hora_inicio ? evento.hora_inicio.substring(0, 5) : '______', 
          multiline: false 
        },
        { 
          label: 'Hora de finalización: ', 
          value: evento.hora_fin ? evento.hora_fin.substring(0, 5) : '______', 
          multiline: false 
        },
        { 
          label: 'Lugar / espacio físico o virtual: ', 
          value: evento.lugar, 
          multiline: true 
        },
        { 
          label: 'Público destinatario (estudiantes / docentes / público general / otro): ', 
          value: evento.publico_destinatario, 
          multiline: true 
        }
      ];

      datosEvento.forEach(dato => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 25;
        }

        if (dato.multiline) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(dato.label, margin, yPosition);
          
          yPosition += 7;
          
          const lineLength = pageWidth - (margin * 2);
          if (dato.value && dato.value !== '______') {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            
            if (dato.large) {
              const descLines = doc.splitTextToSize(dato.value, lineLength);
              doc.text(descLines, margin, yPosition);
              yPosition += (descLines.length * 6) + 5;
            } else {
              doc.text(dato.value, margin, yPosition);
              yPosition += 10;
            }
          } else {
            doc.line(margin, yPosition - 3, margin + lineLength, yPosition - 3);
            yPosition += 10;
          }
        } else {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(dato.label, margin, yPosition);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          const labelWidth = doc.getTextWidth(dato.label);
          
          const lineStartX = margin + labelWidth;
          const lineLength = pageWidth - margin - lineStartX - 5;
          
          if (dato.value && dato.value !== '______') {
            doc.text(dato.value, lineStartX + 2, yPosition);
          } else {
            doc.line(lineStartX, yPosition - 3, lineStartX + lineLength, yPosition - 3);
          }
          
          yPosition += 10;
        }
        
        doc.setFontSize(12);
      });

      yPosition += 10;

      // ===== SECCIÓN: MATERIAL COMPLEMENTARIO =====
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Material complementario', margin + 12, yPosition);
      
      yPosition += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Archivos adjuntos (flyer preliminar, programa, PDF informativo, fotos, etc.):', margin, yPosition);
      
      yPosition += 7;
      
      const lineLength = pageWidth - (margin * 2);
      if (evento.archivo_adjunto) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${evento.archivo_adjunto}`, margin, yPosition);
        yPosition += 10;
      } else {
        doc.line(margin, yPosition - 3, margin + lineLength, yPosition - 3);
        yPosition += 10;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Links relevantes (formulario de inscripción, redes, streaming, etc.):', margin, yPosition);
      
      yPosition += 7;
      
      if (evento.links) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const linksLines = doc.splitTextToSize(evento.links, lineLength);
        doc.text(linksLines, margin, yPosition);
        yPosition += (linksLines.length * 6) + 5;
      } else {
        doc.line(margin, yPosition - 3, margin + lineLength, yPosition - 3);
        yPosition += 10;
      }

      doc.setFontSize(12);
      yPosition += 5;

      // ===== SECCIÓN: OBSERVACIONES ADICIONALES =====
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones adicionales', margin + 12, yPosition);
      
      yPosition += 15;

      doc.setFont('helvetica', 'normal');
      if (evento.observaciones) {
        const obsLines = doc.splitTextToSize(evento.observaciones, lineLength);
        doc.text(obsLines, margin, yPosition);
        yPosition += (obsLines.length * 6) + 10;
      } else {
        for (let i = 0; i < 4; i++) {
          doc.line(margin, yPosition - 3, margin + lineLength, yPosition - 3);
          yPosition += 8;
        }
      }

      // ===== PIE DE PÁGINA =====
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Generado el ${new Date().toLocaleString('es-ES')} - Página ${i} de ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // ← DIFERENCIA: Retornar Buffer en lugar de guardar
      const pdfBuffer = doc.output('arraybuffer');
      resolve(Buffer.from(pdfBuffer));
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      reject(error);
    }
  });
};

/**
 * Formatea la fecha del evento (incluye rango si es multi-día)
 */
const formatearFecha = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio).toLocaleDateString('es-ES');
  
  if (fechaFin && fechaFin !== fechaInicio) {
    const fin = new Date(fechaFin).toLocaleDateString('es-ES');
    return `${inicio} al ${fin}`;
  }
  
  return inicio;
};

/**
 * Envía el PDF del evento por correo (a múltiples destinatarios)
 * @param {Object} evento - Datos del evento
 * @param {Array|String} correosDestino - Email(s) del destinatario(s)
 * @returns {Promise}
 */
const enviarPDFPorCorreo = async (evento, correosDestino, tipoAccion = 'creado') => {
  try {
    // Convertir a array si viene string
    const listaCorreos = Array.isArray(correosDestino) 
      ? correosDestino.filter(c => c && c.length > 0) 
      : [correosDestino];

    console.log(`📧 Preparando envío de PDF a: ${listaCorreos.join(', ')} (${tipoAccion})`);

    const pdfBuffer = await generarPDFBuffer(evento);
    const nombreArchivo = `Formulario_${evento.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // ← Usar tipoAccion para mensajes dinámicos, SI ES ACTUALIZADO 1 SI ES CREADO 2
    const asuntoTexto = tipoAccion === 'actualizado' 
      ? `${evento.categoria_nombre}`
      : `${evento.categoria_nombre}`;

    const mensajeTexto = tipoAccion === 'actualizado'
      ? '<p><strong>⚠️ Este evento ha sido actualizado.</strong> Se adjunta el formulario actualizado.</p>'
      : '<p>Se adjunta el formulario oficial en PDF para su registro.</p>';

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: listaCorreos.join(', '),  // ← Enviar a múltiples correos
      subject: asuntoTexto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0;">
              ${tipoAccion === 'actualizado' ? '🔄 Evento Actualizado' : '✅ Evento Registrado Correctamente'}
            </h2>
            
            <div style="background-color: white; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #007bff;">${evento.nombre}</h3>
              <p><strong>Categoría:</strong> ${evento.categoria_nombre}</p>
              <p><strong>Fecha:</strong> ${evento.fecha_fin && evento.fecha_fin !== evento.fecha_evento 
                ? `${new Date(evento.fecha_evento).toLocaleDateString('es-ES')} al ${new Date(evento.fecha_fin).toLocaleDateString('es-ES')}`
                : new Date(evento.fecha_evento).toLocaleDateString('es-ES')}</p>
              <p><strong>Hora Inicio:</strong> ${evento.hora_inicio ? evento.hora_inicio.substring(0, 5) : '--:--'}</p>
              <p><strong>Hora Fin:</strong> ${evento.hora_fin ? evento.hora_fin.substring(0, 5) : '--:--'}</p>
              <p><strong>Lugar:</strong> ${evento.lugar}</p>
              <p><strong>Público:</strong> ${evento.publico_destinatario}</p>
            </div>

            ${mensajeTexto}

            <div style="background-color: #e7f3ff; padding: 10px; border-radius: 4px; margin-top: 20px;">
              <p style="margin: 0; color: #004085; font-size: 12px;">
                Este es un correo automático del Sistema de Registro de Eventos (SRE).
                No responda a este correo.
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: nombreArchivo,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        }
      ]
    });

    console.log(`✅ PDF enviado a ${listaCorreos.join(', ')}`);
    return info;

  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    throw new Error(`Error al enviar correo: ${error.message}`);
  }
};

/**
 * Envía correo de notificación de reserva (sin PDF)
 * @param {Object} reserva - Datos de la reserva
 * @param {Array|String} correosDestino - Email(s) del destinatario(s)
 * @param {String} tipoAccion - 'creada', 'aprobada', 'rechazada'
 * @returns {Promise}
 */
const enviarCorreoReserva = async (reserva, correosDestino, tipoAccion = 'creada') => {
  try {
    // Convertir a array si viene string
    const listaCorreos = Array.isArray(correosDestino) 
      ? correosDestino.filter(c => c && c.length > 0) 
      : [correosDestino];

    console.log(`📧 Preparando envío de correo de reserva a: ${listaCorreos.join(', ')} (${tipoAccion})`);

    // Formatear fechas
    const fechaInicio = new Date(reserva.fecha_inicio).toLocaleDateString('es-ES');
    const fechaFin = new Date(reserva.fecha_fin).toLocaleDateString('es-ES');
    const horaInicio = reserva.hora_inicio ? reserva.hora_inicio.substring(0, 5) : '--:--';
    const horaFin = reserva.hora_fin ? reserva.hora_fin.substring(0, 5) : '--:--';

    // Determinar el rango de fechas
    const rangoFechas = fechaInicio === fechaFin 
      ? fechaInicio 
      : `${fechaInicio} al ${fechaFin}`;

    // Mapear tipos de acción a mensajes
    const tiposAccion = {
      'creada': {
        titulo: '✅ Reserva Creada Correctamente',
        descripcion: 'La reserva se ha registrado en el sistema.',
        color: '#27ae60'
      },
      'aprobada': {
        titulo: '🎉 Reserva Aprobada',
        descripcion: 'La reserva ha sido aprobada y confirmada.',
        color: '#2980b9'
      },
      'rechazada': {
        titulo: '❌ Reserva Rechazada',
        descripcion: 'Tu reserva ha sido rechazada. Contacta con administración para más detalles.',
        color: '#e74c3c'
      }
    };

    const tipoConfig = tiposAccion[tipoAccion] || tiposAccion['creada'];
    const estadoTexto = reserva.estado === 'pendiente' 
      ? '⏳ Pendiente de aprobación' 
      : reserva.estado === 'confirmada' 
        ? '✅ Confirmada' 
        : '❌ Rechazada';

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: listaCorreos.join(', '),
      // ← ASUNTO ORIGINAL (comentado para sistema de automatización de calendarios)
      // subject: `Notificación de Reserva: ${reserva.titulo} - ${tipoConfig.titulo}`,
      // ← ASUNTO CORTO PARA AUTOMATIZACIÓN DE CALENDARIOS
      subject: `Reserva: ${reserva.espacio_nombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0; font-size: 18px;">
              ${tipoConfig.titulo}
            </h2>
            
            <p style="color: #666; font-size: 14px; margin: 10px 0;">
              ${tipoConfig.descripcion}
            </p>

            <!-- TARJETA PRINCIPAL DE INFORMACIÓN -->
            <div style="background-color: white; padding: 20px; border-left: 5px solid ${tipoConfig.color}; margin: 20px 0; border-radius: 4px;">
              
              <h3 style="margin: 0 0 15px 0; color: ${tipoConfig.color}; font-size: 16px;">
                📋 ${reserva.titulo}
              </h3>

              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <table style="width: 100%; font-size: 14px; line-height: 1.8;">
                  <tr>
                    <td style="font-weight: bold; color: #333; width: 40%;"><strong>📍 Espacio:</strong></td>
                    <td style="color: #555;">${reserva.espacio_nombre || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>📅 Fecha:</strong></td>
                    <td style="color: #555;">${rangoFechas}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>🕐 Hora:</strong></td>
                    <td style="color: #555;">${horaInicio} - ${horaFin}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>📌 Número:</strong></td>
                    <td style="color: #555; font-family: 'Courier New', monospace;">${reserva.numero_reserva || 'N/A'}</td>
                  </tr>
                  <tr style="border-top: 1px solid #ddd; padding-top: 10px;">
                    <td style="font-weight: bold; color: #333;"><strong>Estado:</strong></td>
                    <td style="color: ${
                      reserva.estado === 'confirmada' ? '#27ae60' : 
                      reserva.estado === 'pendiente' ? '#f39c12' : 
                      '#e74c3c'
                    }; font-weight: bold;">
                      ${estadoTexto}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- SECCIÓN DE RECURSOS -->
              ${reserva.recursos && reserva.recursos.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #333; font-size: 12px;">🎛️ Recursos solicitados:</p>
                <div style="background-color: #f0f7ff; padding: 10px; border-left: 3px solid #3498db; border-radius: 3px;">
                  <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 13px;">
                    ${reserva.recursos.map(r => `
                      <li style="margin-bottom: 5px;">
                        <strong>${r.recurso_nombre}</strong> - Cantidad: ${r.cantidad_solicitada}${r.observaciones ? ` (${r.observaciones})` : ''}
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </div>
              ` : `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #333; font-size: 12px;">🎛️ Recursos:</p>
                <p style="margin: 0; color: #999; font-size: 13px; padding: 10px; background-color: #f9f9f9; border-radius: 3px;">
                  No hay recursos asociados a esta reserva
                </p>
              </div>
              `}

              ${reserva.descripcion ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #333; font-size: 12px;">📝 Descripción:</p>
                <p style="margin: 0; color: #666; font-size: 13px; padding: 10px; background-color: #f9f9f9; border-radius: 3px;">
                  ${reserva.descripcion}
                </p>
              </div>
              ` : ''}

              ${reserva.observaciones ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #333; font-size: 12px;">💬 Observaciones:</p>
                <p style="margin: 0; color: #666; font-size: 13px; padding: 10px; background-color: #f9f9f9; border-radius: 3px;">
                  ${reserva.observaciones}
                </p>
              </div>
              ` : ''}

            </div>

            <!-- INFORMACIÓN DE SOLICITANTE -->
            <div style="background-color: #e8f4fd; padding: 15px; border-radius: 4px; margin-bottom: 15px; font-size: 13px;">
              <p style="margin: 0 0 8px 0;"><strong>👤 Solicitante:</strong> ${reserva.usuario_nombre || 'N/A'}</p>
              ${reserva.usuario_email ? `<p style="margin: 0 0 8px 0;"><strong>📧 Email:</strong> ${reserva.usuario_email}</p>` : ''}
              ${reserva.usuario_telefono ? `<p style="margin: 0;"><strong>📞 Teléfono:</strong> ${reserva.usuario_telefono}</p>` : ''}
            </div>

            <!-- INFORMACIÓN DE APROBACIÓN (si aplica) -->
            ${reserva.estado === 'pendiente' ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin-bottom: 15px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; font-size: 13px; color: #856404;">
                <strong>⏳ Nota:</strong> Esta reserva requiere aprobación de un administrador. Recibirás una notificación cuando sea procesada.
              </p>
            </div>
            ` : ''}

            ${reserva.aprobador_nombre ? `
            <div style="background-color: #d4edda; padding: 15px; border-radius: 4px; margin-bottom: 15px; font-size: 13px;">
              <p style="margin: 0;"><strong>✓ Aprobador:</strong> ${reserva.aprobador_nombre}</p>
            </div>
            ` : ''}

            <!-- PIE DE PÁGINA -->
            <div style="background-color: #e7f3ff; padding: 12px; border-radius: 4px; margin-top: 20px;">
              <p style="margin: 0; color: #004085; font-size: 11px; text-align: center;">
                <strong>Sistema de Reserva de Espacios (SRE)</strong><br/>
                Este es un correo automático del sistema. No responda a este correo.
              </p>
            </div>

          </div>
        </div>
      `
    });

    console.log(`✅ Correo de reserva enviado a ${listaCorreos.join(', ')}`);
    return info;

  } catch (error) {
    console.error('❌ Error enviando correo de reserva:', error);
    throw new Error(`Error al enviar correo de reserva: ${error.message}`);
  }
};

const enviarCorreoEdicionReserva = async (reserva, datosAnteriores, correosDestino, editadoPor) => {
  try {
    // Convertir a array si viene string
    const listaCorreos = Array.isArray(correosDestino) 
      ? correosDestino.filter(c => c && c.length > 0) 
      : [correosDestino];

    console.log(`📧 Preparando envío de correo de EDICIÓN de reserva a: ${listaCorreos.join(', ')}`);

    // Función para parsear fechas YYYY-MM-DD sin problemas de zona horaria
    const formatearFechaLocal = (fechaStr) => {
      if (!fechaStr) return '--/--/----';
      // Parseamos la fecha manualmente para evitar problemas de UTC
      const [año, mes, día] = fechaStr.split('-');
      const date = new Date(parseInt(año), parseInt(mes) - 1, parseInt(día));
      return date.toLocaleDateString('es-ES');
    };

    // Formatear fechas sin problemas de zona horaria
    const fechaInicio = formatearFechaLocal(reserva.fecha_inicio);
    const fechaFin = formatearFechaLocal(reserva.fecha_fin);
    const horaInicio = reserva.hora_inicio ? reserva.hora_inicio.substring(0, 5) : '--:--';
    const horaFin = reserva.hora_fin ? reserva.hora_fin.substring(0, 5) : '--:--';

    // Determinar el rango de fechas
    const rangoFechas = fechaInicio === fechaFin 
      ? fechaInicio 
      : `${fechaInicio} al ${fechaFin}`;

    // Identificar cambios
    const cambios = [];
    
    // Normalizar fechas para comparación correcta (por si acaso)
    const normalizarFecha = (fecha) => {
      if (!fecha) return null;
      if (typeof fecha === 'string' && fecha.includes('T')) {
        return fecha.split('T')[0];
      }
      return fecha;
    };
    
    const fechaInicio_ant = normalizarFecha(datosAnteriores.fecha_inicio);
    const fechaFin_ant = normalizarFecha(datosAnteriores.fecha_fin);
    
    if (fechaInicio_ant !== reserva.fecha_inicio || datosAnteriores.hora_inicio !== reserva.hora_inicio) {
      const fechaInicioAnterior = formatearFechaLocal(fechaInicio_ant);
      cambios.push(`Fecha/Hora inicio: ${fechaInicioAnterior} ${datosAnteriores.hora_inicio} → ${fechaInicio} ${horaInicio}`);
    }
    if (fechaFin_ant !== reserva.fecha_fin || datosAnteriores.hora_fin !== reserva.hora_fin) {
      const fechaFinAnterior = formatearFechaLocal(fechaFin_ant);
      cambios.push(`Fecha/Hora fin: ${fechaFinAnterior} ${datosAnteriores.hora_fin} → ${fechaFin} ${horaFin}`);
    }
    if (datosAnteriores.titulo !== reserva.titulo) {
      cambios.push(`Título: "${datosAnteriores.titulo}" → "${reserva.titulo}"`);
    }
    if (datosAnteriores.descripcion !== reserva.descripcion) {
      cambios.push(`Descripción: Actualizada`);
    }
    if (datosAnteriores.cantidad_participantes !== reserva.cantidad_participantes) {
      cambios.push(`Participantes: ${datosAnteriores.cantidad_participantes} → ${reserva.cantidad_participantes}`);
    }
    if (datosAnteriores.motivo !== reserva.motivo) {
      cambios.push(`Motivo: ${datosAnteriores.motivo} → ${reserva.motivo}`);
    }

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: listaCorreos.join(', '),
      subject: `Reserva Modificada: ${reserva.espacio_nombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #f39c12; margin-top: 0; font-size: 18px;">
              🔄 Reserva Modificada
            </h2>
            
            <p style="color: #666; font-size: 14px; margin: 10px 0;">
              La reserva ha sido editada por <strong>${editadoPor}</strong>. A continuación se detallan los cambios realizados y los datos actuales de la reserva.
            </p>

            <!-- TARJETA PRINCIPAL DE INFORMACIÓN -->
            <div style="background-color: white; padding: 20px; border-left: 5px solid #f39c12; margin: 20px 0; border-radius: 4px;">
              
              <h3 style="margin: 0 0 15px 0; color: #f39c12; font-size: 16px;">
                📋 ${reserva.titulo}
              </h3>

              <!-- CAMBIOS REALIZADOS -->
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin-bottom: 15px; border-left: 4px solid #f39c12;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404; font-size: 13px;">Cambios realizados:</p>
                <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 13px;">
                  ${cambios.map(cambio => `<li style="margin-bottom: 5px;">${cambio}</li>`).join('')}
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                  <strong>Editado por:</strong> ${editadoPor}
                </p>
              </div>

              <!-- DATOS ACTUALES -->
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #333; font-size: 13px;">Datos actuales de la reserva:</p>
                <table style="width: 100%; font-size: 14px; line-height: 1.8;">
                  <tr>
                    <td style="font-weight: bold; color: #333; width: 40%;"><strong>📍 Espacio:</strong></td>
                    <td style="color: #555;">${reserva.espacio_nombre || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>📅 Fecha:</strong></td>
                    <td style="color: #555;">${rangoFechas}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>🕐 Hora:</strong></td>
                    <td style="color: #555;">${horaInicio} - ${horaFin}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>📌 Número:</strong></td>
                    <td style="color: #555; font-family: 'Courier New', monospace;">${reserva.numero_reserva || 'N/A'}</td>
                  </tr>
                  <tr style="border-top: 1px solid #ddd;">
                    <td style="font-weight: bold; color: #333;"><strong>Estado:</strong></td>
                    <td style="color: #27ae60; font-weight: bold;">✅ Confirmada</td>
                  </tr>
                </table>
              </div>

              <!-- SECCIÓN DE RECURSOS -->
              ${reserva.recursos && reserva.recursos.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #333; font-size: 12px;">🎛️ Recursos solicitados:</p>
                <div style="background-color: #f0f7ff; padding: 10px; border-left: 3px solid #3498db; border-radius: 3px;">
                  <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 13px;">
                    ${reserva.recursos.map(r => `
                      <li style="margin-bottom: 5px;">
                        <strong>${r.nombre}</strong> - Cantidad: ${r.cantidad_solicitada}${r.observaciones ? ` (${r.observaciones})` : ''}
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </div>
              ` : ''}

              ${reserva.descripcion ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-weight: bold; color: #333; font-size: 12px;">📝 Descripción:</p>
                <p style="margin: 0; color: #666; font-size: 13px; padding: 10px; background-color: #f9f9f9; border-radius: 3px;">
                  ${reserva.descripcion}
                </p>
              </div>
              ` : ''}

            </div>

            <!-- INFORMACIÓN DE SOLICITANTE -->
            <div style="background-color: #e8f4fd; padding: 15px; border-radius: 4px; margin-bottom: 15px; font-size: 13px;">
              <p style="margin: 0 0 8px 0;"><strong>👤 Solicitante:</strong> ${reserva.usuario_nombre || 'N/A'}</p>
              ${reserva.usuario_email ? `<p style="margin: 0;"><strong>📧 Email:</strong> ${reserva.usuario_email}</p>` : ''}
            </div>

            <!-- PIE DE PÁGINA -->
            <div style="background-color: #e7f3ff; padding: 12px; border-radius: 4px; margin-top: 20px;">
              <p style="margin: 0; color: #004085; font-size: 11px; text-align: center;">
                <strong>Sistema de Reserva de Espacios (SRE)</strong><br/>
                Este es un correo automático del sistema. No responda a este correo.
              </p>
            </div>

          </div>
        </div>
      `
    });

    console.log(`✅ Correo de edición enviado a ${listaCorreos.join(', ')}`);
    return info;

  } catch (error) {
    console.error('❌ Error enviando correo de edición:', error);
    throw new Error(`Error al enviar correo de edición: ${error.message}`);
  }
};

// Enviar correo de cancelación de reserva
const enviarCorreoCancelacionReserva = async (reserva, correosDestino) => {
  try {
    // Convertir a array si viene string
    const listaCorreos = Array.isArray(correosDestino) 
      ? correosDestino.filter(c => c && c.length > 0) 
      : [correosDestino];

    console.log(`📧 Preparando envío de correo de cancelación a: ${listaCorreos.join(', ')}`);

    // Formatear fechas
    const fechaInicio = new Date(reserva.fecha_inicio).toLocaleDateString('es-ES');
    const fechaFin = new Date(reserva.fecha_fin).toLocaleDateString('es-ES');
    const horaInicio = reserva.hora_inicio ? reserva.hora_inicio.substring(0, 5) : '--:--';
    const horaFin = reserva.hora_fin ? reserva.hora_fin.substring(0, 5) : '--:--';

    // Determinar el rango de fechas
    const rangoFechas = fechaInicio === fechaFin 
      ? fechaInicio 
      : `${fechaInicio} al ${fechaFin}`;

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: listaCorreos.join(', '),
      subject: `Cancelación de Reserva: ${reserva.numero_reserva} - ${reserva.espacio_nombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #c0392b; margin-top: 0; font-size: 18px;">
              🗑️ Reserva Cancelada
            </h2>
            
            <p style="color: #666; font-size: 14px; margin: 10px 0;">
              La siguiente reserva ha sido cancelada:
            </p>

            <!-- TARJETA PRINCIPAL DE INFORMACIÓN -->
            <div style="background-color: white; padding: 20px; border-left: 5px solid #c0392b; margin: 20px 0; border-radius: 4px;">
              
              <h3 style="margin: 0 0 15px 0; color: #c0392b; font-size: 16px;">
                📋 ${reserva.titulo}
              </h3>

              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <table style="width: 100%; font-size: 14px; line-height: 1.8;">
                  <tr>
                    <td style="font-weight: bold; color: #333; width: 40%;"><strong>Número de Reserva:</strong></td>
                    <td style="color: #555; font-family: 'Courier New', monospace;">${reserva.numero_reserva || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>📍 Espacio:</strong></td>
                    <td style="color: #555;">${reserva.espacio_nombre || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>📅 Fecha:</strong></td>
                    <td style="color: #555;">${rangoFechas}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold; color: #333;"><strong>🕐 Hora:</strong></td>
                    <td style="color: #555;">${horaInicio} - ${horaFin}</td>
                  </tr>
                  <tr style="border-top: 1px solid #ddd; padding-top: 10px;">
                    <td style="font-weight: bold; color: #c0392b;"><strong>Estado:</strong></td>
                    <td style="color: #c0392b; font-weight: bold;">
                      ❌ Cancelada
                    </td>
                  </tr>
                </table>
              </div>

              <p style="color: #666; font-size: 13px; margin-top: 15px;">
                Si tienes consultas sobre esta cancelación, contacta con el área de administración.
              </p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 20px; text-align: center;">
              Sistema de Reserva de Espacios - UTN Facultad Regional Resistencia
            </p>
          </div>
        </div>
      `
    });

    console.log(`✅ Correo de cancelación enviado a ${listaCorreos.join(', ')}`);
    return info;

  } catch (error) {
    console.error('❌ Error enviando correo de cancelación:', error);
    throw new Error(`Error al enviar correo de cancelación: ${error.message}`);
  }
};

module.exports = {
  enviarPDFPorCorreo,
  generarPDFBuffer,
  enviarCorreoReserva,
  enviarCorreoEdicionReserva,
  enviarCorreoCancelacionReserva
};