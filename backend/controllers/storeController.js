// Plan du magasin (boutique officielle) : zones, rayons numérotés, parcours d'allée en allée.
const Category = require('../models/Category');
const Product = require('../models/Product');
const Endcap = require('../models/Endcap');
const { ZONES, ZONE_ORDER } = require('../utils/ensureStore');
const asyncHandler = require('../utils/asyncHandler');
const { loadEndcaps } = require('./endcapController');

const layoutOf = (c) => c.layout || (c.zone === 'general' ? 'free' : 'grid');
const OFFICIAL = { origin: { $ne: 'market' }, published: { $ne: false } };

// Rayons ayant des produits, dans l'ordre du parcours : périmètre frais → allées centrales → marchandises générales
async function walk() {
  const [cats, counts] = await Promise.all([
    Category.find({ zone: { $in: ZONE_ORDER } }).lean(),
    Product.aggregate([{ $match: OFFICIAL }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const n = new Map(counts.map((c) => [String(c._id), c.n]));
  return cats
    .filter((c) => n.get(String(c._id)) > 0)
    .map((c) => ({ ...c, layout: layoutOf(c), products: n.get(String(c._id)) }))
    .sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) || a.aisle - b.aisle || a.name.localeCompare(b.name));
}

const brief = (c) => (c ? { _id: c._id, name: c.name, icon: c.icon, slug: c.slug, aisle: c.aisle, zone: c.zone } : null);

// GET /api/store (public) — le plan : zones, rayons et têtes de gondole du magasin
exports.getStore = asyncHandler(async (req, res) => {
  const rayons = await walk();
  const zones = ZONE_ORDER.map((key) => ({
    key,
    ...ZONES[key],
    rayons: rayons.filter((r) => r.zone === key).map((r) => ({ _id: r._id, name: r.name, icon: r.icon, slug: r.slug, aisle: r.aisle, layout: r.layout, bays: r.bays, products: r.products })),
  }));
  res.json({ zones, endcaps: await loadEndcaps({ store: true }), total: rayons.reduce((s, r) => s + r.products, 0) });
});

// GET /api/store/rayon/:slug (public) — un rayon, ses voisins (allée précédente / suivante) et ses têtes de gondole
exports.getRayon = asyncHandler(async (req, res) => {
  const cat = await Category.findOne({ slug: req.params.slug }).lean();
  if (!cat || !ZONE_ORDER.includes(cat.zone)) {
    res.status(404);
    throw new Error('Rayon introuvable');
  }
  const order = await walk();
  const i = order.findIndex((r) => String(r._id) === String(cat._id));
  const here = order[i] || { ...cat, layout: layoutOf(cat), products: 0 };
  res.json({
    rayon: { _id: cat._id, name: cat.name, icon: cat.icon, slug: cat.slug, aisle: cat.aisle, zone: cat.zone, layout: layoutOf(cat), bays: cat.bays, products: here.products },
    zone: { key: cat.zone, ...ZONES[cat.zone] },
    prev: brief(order[i - 1]),
    next: brief(order[i + 1]),
    endcaps: await loadEndcaps({ rayon: cat._id, zone: cat.zone }),
  });
});

// GET /api/store/zone/:zone (public) — une zone avec ses rayons et un aperçu de chacun
exports.getZone = asyncHandler(async (req, res) => {
  const key = req.params.zone;
  if (!ZONE_ORDER.includes(key)) {
    res.status(404);
    throw new Error('Zone introuvable');
  }
  const rayons = (await walk()).filter((r) => r.zone === key);
  const withPreview = await Promise.all(
    rayons.map(async (r) => ({
      _id: r._id, name: r.name, icon: r.icon, slug: r.slug, aisle: r.aisle, layout: r.layout, bays: r.bays, products: r.products,
      preview: await Product.find({ ...OFFICIAL, category: r._id }).sort('position -sold').limit(5).select('name image price oldPrice stock'),
    }))
  );
  res.json({ zone: { key, ...ZONES[key] }, rayons: withPreview, endcaps: await loadEndcaps({ zone: key }) });
});
