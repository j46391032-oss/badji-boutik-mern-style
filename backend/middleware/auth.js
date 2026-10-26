const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const asyncHandler = require('../utils/asyncHandler');
const { isStaff, isOwner, can, MODULES } = require('../utils/permissions');

// Vérifie un jeton de session et renvoie l'utilisateur (ou une erreur lisible)
// - algorithme imposé (HS256) ; un jeton de double authentification (« scope ») ne sert pas de session
// - refusé si le mot de passe a été changé (ou « déconnexion partout ») depuis son émission (version de session)
async function sessionUser(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return { status: 401, message: 'Session expirée, veuillez vous reconnecter' };
  }
  if (decoded.scope) return { status: 401, message: 'Session invalide, veuillez vous reconnecter' };
  const user = await User.findById(decoded.id);
  if (!user) return { status: 401, message: 'Utilisateur introuvable' };
  if (user.blocked) return { status: 403, message: 'Ce compte est suspendu. Contactez le support.' };
  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) return { status: 401, message: 'Session expirée, veuillez vous reconnecter' };
  return { user };
}
exports.sessionUser = sessionUser;

// Vérifie le token JWT et charge l'utilisateur
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Non autorisé : veuillez vous connecter');
  }
  const { user, status, message } = await sessionUser(header.slice(7));
  if (!user) {
    res.status(status);
    throw new Error(message);
  }
  req.user = user;
  next();
});

// Charge l'utilisateur s'il y a un token valide, sans jamais refuser la requête
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const { user } = await sessionUser(header.slice(7));
      if (user) req.user = user;
    } catch {
      /* token invalide : on continue comme visiteur */
    }
  }
  next();
});

// Gestion des rôles : réservé au personnel (administrateur du projet ou sous-administrateur)
exports.adminOnly = (req, res, next) => {
  if (isStaff(req.user)) return next();
  res.status(403);
  throw new Error("Accès réservé à l'administrateur");
};

// Réservé à l'administrateur du projet (équipe, journal d'activité…)
exports.ownerOnly = (req, res, next) => {
  if (isOwner(req.user)) return next();
  res.status(403);
  throw new Error("Accès réservé à l'administrateur principal du projet");
};

// Droit sur un module : l'administrateur du projet passe toujours ; un sous-administrateur doit l'avoir reçu
exports.permit = (mod) => (req, res, next) => {
  if (can(req.user, mod)) return next();
  res.status(403);
  throw new Error(`Vous n'avez pas l'autorisation d'accéder à : ${MODULES[mod] || mod}`);
};

// Réservé aux vendeurs (utilisateur propriétaire d'une boutique) : charge la boutique dans req.shop
exports.sellerOnly = asyncHandler(async (req, res, next) => {
  const shop = req.user.shop ? await Supplier.findOne({ _id: req.user.shop, owner: req.user._id }) : null;
  if (!shop) {
    res.status(403);
    throw new Error("Vous n'avez pas encore de boutique");
  }
  req.shop = shop;
  next();
});

// La boutique doit être validée par l'administrateur pour publier et vendre
exports.shopApproved = (req, res, next) => {
  if (req.shop.status === 'approved') return next();
  res.status(403);
  throw new Error(req.shop.status === 'pending' ? "Votre boutique est en attente de validation par l'administrateur" : 'Votre boutique est suspendue. Contactez le support.');
};
