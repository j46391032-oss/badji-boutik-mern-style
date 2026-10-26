// Vérifications au démarrage : en production, on refuse de démarrer avec une configuration dangereuse.
const WEAK = ['remplacez_par_une_longue_phrase_secrete_unique', 'secret', 'changeme', 'password', 'jwt_secret'];

function checkEnv({ exit = true, log = console } = {}) {
  const prod = process.env.NODE_ENV === 'production';
  const problems = [];
  const warnings = [];
  const secret = String(process.env.JWT_SECRET || '');

  if (!secret) problems.push('JWT_SECRET est absent.');
  else if (secret.length < 32 || WEAK.includes(secret.toLowerCase())) (prod ? problems : warnings).push('JWT_SECRET est trop court ou trop simple (32 caractères aléatoires minimum).');
  if (prod && /localhost|127\.0\.0\.1/.test(process.env.CLIENT_URL || '')) warnings.push('CLIENT_URL contient « localhost » : renseignez l’adresse publique du site.');
  if (prod && !process.env.CLIENT_URL) warnings.push('CLIENT_URL n’est pas défini.');
  if (prod && /^mongodb:\/\/(127\.0\.0\.1|localhost)/.test(process.env.MONGO_URI || '')) warnings.push('MONGO_URI pointe vers une base locale.');

  warnings.forEach((w) => log.warn(`⚠️  ${w}`));
  if (problems.length) {
    problems.forEach((p) => log.error(`⛔ ${p}`));
    if (exit) process.exit(1);
  }
  return { problems, warnings };
}

module.exports = checkEnv;
