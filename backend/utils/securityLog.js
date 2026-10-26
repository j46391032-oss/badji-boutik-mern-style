const SecurityEvent = require('../models/SecurityEvent');

// Enregistre un évènement de sécurité sans jamais faire échouer la requête
module.exports = function logSecurity(req, type, { user, email, detail } = {}) {
  return SecurityEvent.create({
    type,
    user: user?._id || user || null,
    email: String(email || user?.email || '').slice(0, 120),
    ip: req?.ip || '',
    userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 200),
    detail: String(detail || '').slice(0, 300),
  }).catch(() => {});
};
