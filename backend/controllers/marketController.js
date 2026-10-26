const Market = require('../models/Market');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const slugify = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const OPEN = { $nin: ['pending', 'suspended'] }; // boutiques visibles du public

// GET /api/markets (public) — les marchés avec leurs catégories et leurs chiffres
exports.getMarkets = asyncHandler(async (req, res) => {
  const filter = req.query.all === '1' ? {} : { active: true };
  const markets = await Market.find(filter).sort('order name').populate('categories', 'name icon').lean();
  const [shops, products] = await Promise.all([
    Supplier.aggregate([{ $match: { owner: { $ne: null }, status: OPEN, market: { $ne: null } } }, { $group: { _id: '$market', n: { $sum: 1 } } }]),
    Product.aggregate([{ $match: { origin: 'market', published: { $ne: false } } }, { $group: { _id: '$market', n: { $sum: 1 } } }]),
  ]);
  const s = new Map(shops.map((x) => [String(x._id), x.n]));
  const p = new Map(products.map((x) => [String(x._id), x.n]));
  res.json(markets.map((m) => ({ ...m, shops: s.get(String(m._id)) || 0, products: p.get(String(m._id)) || 0 })));
});

// GET /api/markets/:slug (public) — un marché et ses boutiques (avec quelques produits en vitrine)
exports.getMarket = asyncHandler(async (req, res) => {
  const market = await Market.findOne({ slug: req.params.slug }).populate('categories', 'name icon').lean();
  if (!market) {
    res.status(404);
    throw new Error('Marché introuvable');
  }
  const shops = await Supplier.find({ market: market._id, owner: { $ne: null }, status: OPEN }).lean();
  const stalls = await Promise.all(
    shops.map(async (s) => {
      const [count, showcase] = await Promise.all([
        Product.countDocuments({ supplier: s._id, published: { $ne: false } }),
        Product.find({ supplier: s._id, published: { $ne: false } }).sort('-sold -createdAt').limit(4).select('name image price'),
      ]);
      return { ...s, products: count, showcase };
    })
  );
  stalls.sort((a, b) => Number(b.verified) - Number(a.verified) || b.products - a.products);
  res.json({ ...market, shops: stalls });
});

// ───────── Administration (droit « boutiques »)
const pick = (b) => {
  const out = {};
  if (b.name !== undefined) out.name = String(b.name).trim();
  ['description', 'icon', 'color'].forEach((k) => b[k] !== undefined && (out[k] = String(b[k]).trim()));
  if (b.order !== undefined) out.order = Number(b.order) || 0;
  if (b.active !== undefined) out.active = Boolean(b.active);
  if (Array.isArray(b.categories)) out.categories = b.categories;
  return out;
};

exports.createMarket = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!data.name) {
    res.status(400);
    throw new Error('Le nom du marché est obligatoire');
  }
  const slug = slugify(data.name);
  if (await Market.exists({ slug })) {
    res.status(400);
    throw new Error('Un marché porte déjà ce nom');
  }
  res.status(201).json(await Market.create({ ...data, slug }));
});

exports.updateMarket = asyncHandler(async (req, res) => {
  const market = await Market.findById(req.params.id);
  if (!market) {
    res.status(404);
    throw new Error('Marché introuvable');
  }
  const data = pick(req.body);
  if (data.categories) {
    // mémorise les catégories retirées pour ne pas les remettre au prochain démarrage
    const next = data.categories.map(String);
    const removed = market.categories.map(String).filter((c) => !next.includes(c));
    market.excluded = [...new Set([...market.excluded.map(String), ...removed])].filter((c) => !next.includes(c));
  }
  Object.assign(market, data); // le lien (slug) ne change pas : les adresses déjà partagées restent valables
  await market.save();
  res.json(await market.populate('categories', 'name icon'));
});

exports.deleteMarket = asyncHandler(async (req, res) => {
  const market = await Market.findById(req.params.id);
  if (!market) {
    res.status(404);
    throw new Error('Marché introuvable');
  }
  if (await Supplier.exists({ market: market._id })) {
    res.status(400);
    throw new Error('Ce marché contient des boutiques : déplacez-les d’abord ou désactivez le marché');
  }
  await market.deleteOne();
  res.json({ message: 'Marché supprimé' });
});
