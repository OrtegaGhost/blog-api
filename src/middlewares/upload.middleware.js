'use strict';

const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');
const sharp  = require('sharp');
const fs     = require('fs');
const env    = require('../config/env');

// Tipos MIME aceptados en la validacion inicial (antes de convertir a WebP)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// Guarda el archivo en memoria para procesarlo con sharp antes de escribir a disco
const storage = multer.memoryStorage();

// Rechaza archivos que no sean imagenes validas
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE: Solo se permiten archivos de imagen'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(env.MAX_FILE_SIZE, 10),
  },
});

/**
 * Convierte el archivo cargado a formato WebP y lo guarda en disco.
 * Debe ejecutarse despues de upload.single() y antes del controlador.
 * Reduce el peso del archivo entre un 30-70% respecto a JPEG/PNG.
 */
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
    const filepath = path.join(env.UPLOAD_DIR, filename);

    // Asegura que el directorio de destino exista
    if (!fs.existsSync(env.UPLOAD_DIR)) {
      fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    }

    await sharp(req.file.buffer)
      .resize({ width: 400, height: 400, fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toFile(filepath);

    // Actualiza req.file para que el controlador use los valores correctos
    req.file.filename = filename;
    req.file.path     = filepath;
    req.file.mimetype = 'image/webp';

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, processImage };
