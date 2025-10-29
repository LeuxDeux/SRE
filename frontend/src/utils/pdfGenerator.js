import jsPDF from 'jspdf';

export const generarPDF = (evento) => {
  return new Promise((resolve, reject) => {
    try {
      // Crear nuevo documento PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 25;
      let yPosition = 25;

      // ===== ENCABEZADO INSTITUCIONAL =====
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      // Cuadrado sólido para el título principal
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      
      doc.text('Formulario de Solicitud de Comunicación – UTN', margin + 12, yPosition);
      
      yPosition += 8;
      doc.setFontSize(14);
      doc.text('Facultad Regional Reconquista', margin + 12, yPosition);

      yPosition += 20;

      // ===== SECCIÓN: DATOS INSTITUCIONALES =====
      // Encabezado de sección con dos cuadrados
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      doc.rect(margin + 7, yPosition - 4, 6, 6, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Datos institucionales', margin + 16, yPosition);

      yPosition += 15;

      // Campos de datos institucionales con líneas
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

        // CLAVE: Negrita + tamaño ligeramente más pequeño
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(dato.label, margin, yPosition);

        // VALOR: Normal + tamaño normal
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

        // Resetear tamaño para siguiente iteración
        doc.setFontSize(12);
        yPosition += 10;
      });

      yPosition += 15;

      // ===== SECCIÓN: DATOS DEL EVENTO =====
      // Encabezado de sección con un cuadrado
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Datos del evento', margin + 12, yPosition);
      
      yPosition += 15;

      // Campos del evento con líneas
      const fechaEvento = evento.fecha_evento ? 
        new Date(evento.fecha_evento).toLocaleDateString('es-ES') : '______';

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
          value: evento.hora_inicio ? evento.hora_inicio.substring(0,5) : '______', 
          multiline: false 
        },
        { 
          label: 'Hora de finalización: ', 
          value: evento.hora_fin ? evento.hora_fin.substring(0,5) : '______', 
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
          // Para campos multilínea, el label va en una línea y la línea para el valor en la siguiente
          
          // CLAVE: Negrita + tamaño ligeramente más pequeño
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(dato.label, margin, yPosition);
          
          yPosition += 7;
          
          const lineLength = pageWidth - (margin * 2);
          if (dato.value && dato.value !== '______') {
            // VALOR: Normal + tamaño normal
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            
            if (dato.large) {
              // Para descripción, mostrar el texto en múltiples líneas
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
          // Para campos de una sola línea
          
          // CLAVE: Negrita + tamaño ligeramente más pequeño
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(dato.label, margin, yPosition);
          
          // VALOR: Normal + tamaño normal
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
        
        // Resetear tamaño para siguiente iteración
        doc.setFontSize(12);
      });

      yPosition += 10;

      // ===== SECCIÓN: MATERIAL COMPLEMENTARIO =====
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 25;
      }

      // Encabezado de sección con un cuadrado
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Material complementario', margin + 12, yPosition);
      
      yPosition += 15;

      // Archivos adjuntos
      // CLAVE: Negrita + tamaño ligeramente más pequeño
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Archivos adjuntos (flyer preliminar, programa, PDF informativo, fotos, etc.):', margin, yPosition);
      
      yPosition += 7;
      
      const lineLength = pageWidth - (margin * 2);
      if (evento.archivo_adjunto) {
        // VALOR: Normal + tamaño normal
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${evento.archivo_adjunto}`, margin, yPosition);
        yPosition += 10;
      } else {
        doc.line(margin, yPosition - 3, margin + lineLength, yPosition - 3);
        yPosition += 10;
      }

      // Links relevantes
      // CLAVE: Negrita + tamaño ligeramente más pequeño
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Links relevantes (formulario de inscripción, redes, streaming, etc.):', margin, yPosition);
      
      yPosition += 7;
      
      if (evento.links) {
        // VALOR: Normal + tamaño normal
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const linksLines = doc.splitTextToSize(evento.links, lineLength);
        doc.text(linksLines, margin, yPosition);
        yPosition += (linksLines.length * 6) + 5;
      } else {
        doc.line(margin, yPosition - 3, margin + lineLength, yPosition - 3);
        yPosition += 10;
      }

      // Resetear tamaño
      doc.setFontSize(12);
      yPosition += 5;

      // ===== SECCIÓN: OBSERVACIONES ADICIONALES =====
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 25;
      }

      // Encabezado de sección con un cuadrado
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, yPosition - 4, 6, 6, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones adicionales', margin + 12, yPosition);
      
      yPosition += 15;

      // Para observaciones, aplicamos el estilo normal ya que es un campo libre
      doc.setFont('helvetica', 'normal');
      if (evento.observaciones) {
        const obsLines = doc.splitTextToSize(evento.observaciones, lineLength);
        doc.text(obsLines, margin, yPosition);
        yPosition += (obsLines.length * 6) + 10;
      } else {
        // Dibujar 4 líneas para observaciones
        for (let i = 0; i < 4; i++) {
          doc.line(margin, yPosition - 3, margin + lineLength, yPosition - 3);
          yPosition += 8;
        }
      }

      // ===== PIE DE PÁGINA =====
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Información de generación
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Generado el ${new Date().toLocaleString('es-ES')} - Página ${i} de ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Guardar el PDF
      const nombreArchivo = `Formulario_Comunicacion_${evento.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`;
      doc.save(nombreArchivo);
      
      resolve(nombreArchivo);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      reject(error);
    }
  });
};