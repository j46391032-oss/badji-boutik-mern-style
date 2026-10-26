const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { imageType } = require('./security');

const dir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(dir, { recursive: true });

// Le fichier est d'abord gardé en mémoire (3 Mo max), vérifié d'après son contenu réel, puis enregistré
// sous un nom aléatoire avec l'extension déduite du contenu : le nom et l'extension envoyés par le client sont ignorés.
// (Sinon, on pourrait déposer une page HTML ou un script déguisé en image sur votre domaine.)
const memory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
});

const save = (req, res, next) => {
  if (!req.file) return next();
  const type = imageType(req.file.buffer);
  if (!type) {
    res.status(400);
    return next(new Error('Seules les vraies images JPG, PNG, WEBP ou GIF sont acceptées'));
  }
  const filename = `${crypto.randomBytes(16).toString('hex')}${type.ext}`;
  fs.writeFile(path.join(dir, filename), req.file.buffer, { flag: 'wx', mode: 0o644 }, (err) => {
    if (err) return next(err);
    req.file = { ...req.file, filename, mimetype: type.mime, buffer: undefined };
    next();
  });
};

module.exports = {
  single: (field) => (req, res, next) => memory.single(field)(req, res, (err) => (err ? next(err) : save(req, res, next))),
  dir,
};
