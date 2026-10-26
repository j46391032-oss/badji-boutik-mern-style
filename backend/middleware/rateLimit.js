// Limiteur de débit en mémoire (sans dépendance). Convient à une seule instance du serveur ;
// avec plusieurs instances, remplacez le stockage par Redis (voir README).
// Désactivé pendant les tests, sauf si FORCE_RATE_LIMIT=1.
const active = () => process.env.NODE_ENV !== 'test' || process.env.FORCE_RATE_LIMIT === '1';
const stores = new Set();

setInterval(() => {
  const now = Date.now();
  for (const store of stores) for (const [k, v] of store) if (v.reset < now) store.delete(k);
}, 60 * 1000).unref();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 30, message = 'Trop de requêtes, réessayez dans quelques minutes.', key = (req) => req.ip } = {}) {
  const hits = new Map();
  stores.add(hits);
  const limiter = (req, res, next) => {
    if (!active()) return next();
    const k = key(req);
    const now = Date.now();
    let rec = hits.get(k);
    if (!rec || rec.reset < now) {
      rec = { count: 0, reset: now + windowMs };
      hits.set(k, rec);
    }
    rec.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(max - rec.count, 0)));
    if (rec.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((rec.reset - now) / 1000)));
      res.status(429);
      return next(new Error(message));
    }
    next();
  };
  limiter.reset = () => hits.clear();
  return limiter;
}

module.exports = rateLimit;
module.exports.active = active;
