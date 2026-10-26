// Rôles : client · admin (sous-administrateur, droits limités) · superadmin (administrateur du projet, tous les droits)
// Un sous-administrateur n'accède qu'aux modules que l'administrateur du projet lui a accordés.
const MODULES = {
  stats: 'Tableau de bord et statistiques',
  produits: 'Catalogue : produits, catégories, vendeurs, bannières',
  commandes: 'Commandes et retours',
  devis: 'Devis et messages',
  clients: 'Clients',
  promos: 'Codes promo',
  avis: 'Avis clients',
  boutiques: 'Boutiques des vendeurs et commissions',
  parametres: 'Paramètres de la boutique',
};
const ALL_MODULES = Object.keys(MODULES);

const isOwner = (u) => u?.role === 'superadmin';
const isStaff = (u) => u?.role === 'admin' || u?.role === 'superadmin';
// L'administrateur du projet peut tout ; un sous-administrateur seulement ses modules
const can = (u, mod) => isOwner(u) || (u?.role === 'admin' && (u.permissions || []).includes(mod));

module.exports = { MODULES, ALL_MODULES, isOwner, isStaff, can };
