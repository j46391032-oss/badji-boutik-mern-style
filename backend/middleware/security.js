// En-têtes de sécurité, nettoyage des entrées (injections NoSQL, paramètres répétés) et vérification des images envoyées.
const isProd = () => process.env.NODE_ENV === 'production';

// En-têtes de sécurité de l'API (équivalent de « helmet », sans dépendance)
exports.securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // les images de /uploads sont affichées par le site
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (isProd()) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // jamais de données personnelles en cache (le catalogue public, lui, reste mis en cache normalement)
  if (req.headers.authorization || /^\/api\/(auth|orders|users|seller|team|shops|inquiries|favorites|stats|coupons)/.test(req.path)) res.setHeader('Cache-Control', 'no-store');
  next();
};

// Supprime les clés dangereuses ($where, $ne, a.b…) qui permettraient des injections d'opérateurs MongoDB
const clean = (value, depth = 0) => {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = clean(v, depth + 1);
  }
  return out;
};

exports.sanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  if (req.params) Object.keys(req.params).forEach((k) => (req.params[k] = String(req.params[k])));
  if (req.query) {
    const q = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      // un paramètre répété (?a=1&a=2) ou imbriqué (?a[$ne]=1) devient une simple valeur texte
      q[k] = Array.isArray(v) ? String(v[v.length - 1]) : typeof v === 'object' && v !== null ? '' : v;
    }
    Object.defineProperty(req, 'query', { value: q, writable: true, configurable: true, enumerable: true });
  }
  next();
};

// Reconnaît le vrai type d'une image d'après ses premiers octets (le nom et le type annoncés par le client ne comptent pas)
exports.imageType = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: '.jpg', mime: 'image/jpeg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: '.png', mime: 'image/png' };
  if (buf.slice(0, 4).toString('latin1') === 'GIF8') return { ext: '.gif', mime: 'image/gif' };
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return { ext: '.webp', mime: 'image/webp' };
  return null;
};
