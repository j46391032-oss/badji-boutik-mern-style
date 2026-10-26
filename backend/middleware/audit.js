const AuditLog = require('../models/AuditLog');
const { isStaff } = require('../utils/permissions');

const MODULES = {
  '/api/products': 'Produits', '/api/categories': 'Catégories', '/api/suppliers': 'Vendeurs', '/api/banners': 'Bannières',
  '/api/orders': 'Commandes', '/api/inquiries': 'Devis et messages', '/api/coupons': 'Codes promo', '/api/reviews': 'Avis',
  '/api/users': 'Clients', '/api/settings': 'Paramètres', '/api/team': 'Équipe', '/api/shops': 'Boutiques', '/api/markets': 'Marchés', '/api/planogram': 'Planogramme', '/api/endcaps': 'Têtes de gondole', '/api/seller': 'Espace vendeur',
};
const VERBS = { POST: 'Création', PUT: 'Modification', PATCH: 'Modification', DELETE: 'Suppression' };

// Enregistre les actions de modification du personnel (jamais les mots de passe) une fois la réponse envoyée
module.exports = function audit(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  res.on('finish', () => {
    const u = req.user;
    if (!u || !isStaff(u) || res.statusCode >= 400) return;
    const module = MODULES[req.baseUrl];
    if (!module) return;
    const b = req.body || {};
    const sub = req.route?.path || '';
    let verb = VERBS[req.method] || req.method;
    if (sub.includes('return')) verb = 'Retour';
    if (sub.includes('duplicate')) verb = 'Duplication';
    if (sub.includes('messages')) verb = 'Réponse';
    if (sub.includes('upload')) verb = 'Envoi d’image';
    const bits = [];
    const label = b.name || b.title || b.code || b.subject || b.shopName;
    if (label) bits.push(String(label).slice(0, 80));
    if (b.status) bits.push(`statut → ${b.status}`);
    if (b.permissions) bits.push(`droits : ${[].concat(b.permissions).join(', ') || 'aucun'}`);
    if (b.blocked !== undefined) bits.push(b.blocked ? 'compte suspendu' : 'compte réactivé');
    if (req.params?.id) bits.push(`#${String(req.params.id).slice(-6)}`);
    AuditLog.create({
      user: u._id, userName: u.name, role: u.role, module, action: `${verb} — ${module}`,
      detail: bits.join(' · '), method: req.method, path: `${req.baseUrl}${sub}`.slice(0, 120), status: res.statusCode,
    }).catch(() => {});
  });
  next();
};
