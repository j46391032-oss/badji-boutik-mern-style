// Plan du magasin (inspiré des supermarchés) : trois zones, des rayons numérotés, des travées.
//   • Périmètre frais      : alimentation fraîche, autour du magasin  → affichage en grille
//   • Allées centrales     : épicerie sèche, boissons, ménage          → affichage en grille (allées numérotées)
//   • Marchandises générales : mode, high-tech, maison, jouets, auto…  → plan libre (flânerie et découverte)
const Category = require('../models/Category');

const ZONES = {
  fresh: { name: 'Périmètre frais', subtitle: 'Alimentation fraîche', icon: '🥬', layout: 'grid', description: 'Fruits, légumes, pain, viande, poisson et laitages : tout autour du magasin, toujours frais.' },
  grocery: { name: 'Allées centrales', subtitle: 'Épicerie sèche', icon: '🛒', layout: 'grid', description: 'Riz, huiles, conserves, boissons et produits ménagers, rangés en allées numérotées.' },
  general: { name: 'Marchandises générales', subtitle: 'Mode, maison, high-tech…', icon: '🛍️', layout: 'free', description: 'Vêtements, électronique, jouets, pharmacie, bricolage, auto : l’aile pour flâner et découvrir.' },
};
const ZONE_ORDER = ['fresh', 'grocery', 'general'];

// [nom, icône, zone, n° d'allée, travées]
const RAYONS = [
  ['Fruits & légumes', '🥭', 'fresh', 1, ['Fruits', 'Légumes', 'Tubercules & racines']],
  ['Boulangerie & pâtisserie', '🥖', 'fresh', 2, ['Pains', 'Viennoiseries', 'Pâtisserie']],
  ['Boucherie & poissonnerie', '🥩', 'fresh', 3, ['Bœuf & mouton', 'Volaille', 'Poissons & fruits de mer']],
  ['Produits laitiers & œufs', '🥛', 'fresh', 4, ['Lait', 'Yaourts & fromages', 'Œufs & beurre']],
  ['Épicerie sèche', '🍚', 'grocery', 1, ['Riz & céréales', 'Huiles & condiments', 'Conserves', 'Sucre, farine & pâtes']],
  ['Boissons', '🧃', 'grocery', 2, ['Eaux', 'Jus & sodas', 'Thés & cafés']],
  ['Alimentation & Boissons', '🥜', 'grocery', 3, ['Boissons du terroir', 'Fruits secs & douceurs', 'Grandes quantités']],
  ['Entretien & ménage', '🧼', 'grocery', 4, ['Lessive & linge', 'Vaisselle', 'Sols & surfaces']],
  ['Vêtements', '👕', 'general', 1, []],
  ['Chaussures', '👟', 'general', 2, []],
  ['Accessoires', '👜', 'general', 3, []],
  ['Électronique', '🎧', 'general', 4, []],
  ['Téléphones & Tablettes', '📱', 'general', 5, []],
  ['Informatique', '💻', 'general', 6, []],
  ['Énergie solaire', '☀️', 'general', 7, []],
  ['Maison', '🏠', 'general', 8, []],
  ['Bébé & Enfants', '🧸', 'general', 9, []],
  ['Jouets & loisirs', '🎲', 'general', 10, []],
  ['Beauté & Soins', '💄', 'general', 11, []],
  ['Pharmacie & santé', '💊', 'general', 12, []],
  ['Sport & Fitness', '⚽', 'general', 13, []],
  ['Bricolage & jardin', '🔧', 'general', 14, []],
  ['Auto & moto', '🚗', 'general', 15, []],
  ['Bureau & Papeterie', '📎', 'general', 16, []],
  ['Artisanat & Déco', '🎨', 'general', 17, []],
];

// Crée les rayons manquants et place les rayons existants sur le plan SANS écraser vos réglages
// (un rayon dont la zone est déjà définie n'est jamais modifié).
async function ensureStore(log = () => {}) {
  for (const [name, icon, zone, aisle, bays] of RAYONS) {
    let cat = await Category.findOne({ name });
    if (!cat) cat = new Category({ name, icon });
    if (!cat.icon) cat.icon = icon;
    if (!cat.zone) {
      cat.zone = zone;
      cat.aisle = aisle;
      if (!cat.bays.length) cat.bays = bays;
    }
    await cat.save();
  }
  // adresses (slug) des catégories créées avant le plan du magasin
  for (const c of await Category.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] })) await c.save();
  log(`Plan du magasin prêt : ${RAYONS.length} rayons en 3 zones.`);
}

module.exports = ensureStore;
module.exports.ZONES = ZONES;
module.exports.ZONE_ORDER = ZONE_ORDER;
module.exports.RAYONS = RAYONS;
