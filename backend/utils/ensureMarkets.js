// Installe les cinq marchés d'origine (sans écraser vos modifications) et range les boutiques existantes.
const Market = require('../models/Market');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

const MARKETS = [
  { slug: 'sandaga', name: 'Marché Sandaga', icon: '🏬', color: '#e0701a', order: 1, description: 'Le grand marché de tout : maison et cuisine, bébé et enfants, bureau et papeterie, sport et fitness.', categories: ['Maison', 'Bébé & Enfants', 'Bureau & Papeterie', 'Sport & Fitness', 'Entretien & ménage', 'Jouets & loisirs', 'Bricolage & jardin', 'Pharmacie & santé'] },
  { slug: 'hlm', name: 'Marché HLM', icon: '🧵', color: '#9b3fb5', order: 2, description: 'Le marché des tissus et de la couture : vêtements, chaussures et accessoires de mode.', categories: ['Vêtements', 'Chaussures', 'Accessoires'] },
  { slug: 'kermel', name: 'Marché Kermel', icon: '🥭', color: '#2f9e44', order: 3, description: 'Produits frais et du terroir : fruits et légumes, viande et poisson, pain, épicerie, boissons, beauté et soins naturels.', categories: ['Alimentation & Boissons', 'Beauté & Soins', 'Fruits & légumes', 'Boulangerie & pâtisserie', 'Boucherie & poissonnerie', 'Produits laitiers & œufs', 'Épicerie sèche', 'Boissons'] },
  { slug: 'colobane', name: 'Marché Colobane', icon: '🔌', color: '#1c7ed6', order: 4, description: 'Le marché du high-tech et de l\'énergie : électronique, téléphones, informatique et solaire.', categories: ['Électronique', 'Téléphones & Tablettes', 'Informatique', 'Énergie solaire', 'Auto & moto'] },
  { slug: 'soumbedioune', name: 'Marché de Soumbédioune', icon: '🎭', color: '#c2410c', order: 5, description: 'Artisanat, art et décoration faits main par les artisans du pays.', categories: ['Artisanat & Déco'] },
];

async function ensureMarkets(log = () => {}) {
  for (const m of MARKETS) {
    const { categories, ...core } = m;
    const market = await Market.findOneAndUpdate({ slug: m.slug }, { $setOnInsert: core }, { new: true, upsert: true });
    // Installe les catégories du marché ; plus tard, n'ajoute que les NOUVELLES catégories (créées après le marché),
    // jamais celles que l'administrateur a retirées.
    const found = await Category.find({ name: { $in: categories } }).select('_id createdAt');
    const have = new Set(market.categories.map(String));
    const dropped = new Set((market.excluded || []).map(String));
    const add = found.filter((c) => !have.has(String(c._id)) && !dropped.has(String(c._id)) && (have.size === 0 || c.createdAt > market.createdAt)).map((c) => c._id);
    if (add.length) await Market.updateOne({ _id: market._id }, { $addToSet: { categories: { $each: add } } });
  }
  // boutiques créées avant les marchés : rangées dans le grand marché généraliste
  const general = await Market.findOne({ slug: 'sandaga' });
  if (general) await Supplier.updateMany({ owner: { $ne: null }, market: null }, { market: general._id });
  // produits des boutiques de vendeurs : « marché » ; tous les autres : « boutique officielle »
  const shops = await Supplier.find({ owner: { $ne: null } }).select('market');
  for (const s of shops) await Product.updateMany({ supplier: s._id, $or: [{ origin: { $ne: 'market' } }, { market: { $ne: s.market } }] }, { origin: 'market', market: s.market });
  log(`${MARKETS.length} marchés prêts.`);
}

module.exports = ensureMarkets;
module.exports.MARKETS = MARKETS;
