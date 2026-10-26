// Verrouille temporairement les essais de connexion répétés (même adresse IP + même email) :
// 5 échecs en 15 minutes → 15 minutes de pause. Une connexion réussie remet le compteur à zéro.
const { active } = require('../middleware/rateLimit');

const MAX = 5;
const WINDOW = 15 * 60 * 1000;
const fails = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of fails) if (v.until < now && v.reset < now) fails.delete(k);
}, 60 * 1000).unref();

const keyOf = (req, email) => `${req.ip}|${String(email || '').toLowerCase().slice(0, 120)}`;

// Secondes à attendre avant de pouvoir réessayer (0 : pas de blocage)
function lockedFor(req, email) {
  if (!active()) return 0;
  const rec = fails.get(keyOf(req, email));
  return rec && rec.until > Date.now() ? Math.ceil((rec.until - Date.now()) / 1000) : 0;
}

function recordFailure(req, email) {
  if (!active()) return false;
  const k = keyOf(req, email);
  const now = Date.now();
  let rec = fails.get(k);
  if (!rec || rec.reset < now) rec = { count: 0, reset: now + WINDOW, until: 0 };
  rec.count += 1;
  if (rec.count >= MAX) rec.until = now + WINDOW;
  fails.set(k, rec);
  return rec.count >= MAX; // vrai : ce dernier échec déclenche le verrouillage
}

const clear = (req, email) => fails.delete(keyOf(req, email));
const resetAll = () => fails.clear();

module.exports = { lockedFor, recordFailure, clear, resetAll, MAX };
