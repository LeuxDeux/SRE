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
 * Envía el PDF del evento por correo
 * @param {Object} evento - Datos del evento
 * @param {String} correoDestino - Email del destinatario
 * @returns {Promise}
 */
const enviarPDFPorCorreo = async (evento, correoDestino, tipoAccion = 'creado') => {
  try {
    console.log(`📧 Preparando envío de PDF a: ${correoDestino} (${tipoAccion})`);

    const pdfBuffer = await generarPDFBuffer(evento);
    const nombreArchivo = `Formulario_${evento.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // ← Usar tipoAccion para mensajes dinámicos
    const asuntoTexto = tipoAccion === 'actualizado' 
      ? `🔄 Evento Actualizado - ${evento.nombre}`
      : `${evento.categoria_nombre}`;

    const mensajeTexto = tipoAccion === 'actualizado'
      ? '<p><strong>⚠️ Este evento ha sido actualizado.</strong> Se adjunta el formulario actualizado.</p>'
      : '<p>Se adjunta el formulario oficial en PDF para su registro.</p>';

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: correoDestino,
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

    console.log(`✅ PDF enviado a ${correoDestino}`);
    return info;

  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    throw new Error(`Error al enviar correo: ${error.message}`);
  }
};

module.exports = {
  enviarPDFPorCorreo,
  generarPDFBuffer
};