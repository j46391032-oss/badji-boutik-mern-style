const crypto = require('crypto');

// Chiffrement des secrets stockés en base (clé de la double authentification) : AES-256-GCM.
// La clé vient de DATA_KEY, ou à défaut de JWT_SECRET (changer l'un de ces secrets rend les secrets 2FA illisibles).
const key = () => crypto.createHash('sha256').update(String(process.env.DATA_KEY || process.env.JWT_SECRET || '')).digest();

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

function decrypt(payload) {
  const [iv, tag, data] = String(payload).split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = { encrypt, decrypt, sha256, safeEqual };
