const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Nombre único: timestamp + nombre original
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "evento-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Filtrar tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".doc",
    ".docx",
    ".rar",
    ".zip",
  ];
  const fileExt = path.extname(file.originalname).toLowerCase();

  console.log(
    `📄 Archivo: ${file.originalname}, MIME: ${file.mimetype}, Ext: ${fileExt}`,
  );

  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Tipo de archivo no permitido: ${fileExt}. Solo PDF, imágenes, documentos, RAR y ZIP.`,
      ),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo por archivo
    files: 5, // Máximo 5 archivos
  },
});

module.exports = upload;
