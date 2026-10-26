const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const FIELDS = ['name', 'verified', 'city', 'country', 'yearsActive', 'rating', 'responseHours', 'onTimeRate', 'repurchaseRate', 'markets'];

const pick = (body) => {
  const out = {};
  FIELDS.forEach((f) => body[f] !== undefined && (out[f] = body[f]));
  if (typeof out.markets === 'string') out.markets = out.markets.split(',').map((s) => s.trim()).filter(Boolean);
  return out;
};

// GET /api/suppliers (admin) — avec le nombre de produits
exports.getSuppliers = asyncHandler(async (req, res) => {
  const [list, counts] = await Promise.all([
    Supplier.find().sort('name').lean(),
    Product.aggregate([{ $match: { supplier: { $ne: null } } }, { $group: { _id: '$supplier', count: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json(list.map((s) => ({ ...s, products: map.get(String(s._id)) || 0 })));
});

exports.createSupplier = asyncHandler(async (req, res) => res.status(201).json(await Supplier.create(pick(req.body))));

exports.updateSupplier = asyncHandler(async (req, res) => {
  const s = await Supplier.findById(req.params.id);
  if (!s) {
    res.status(404);
    throw new Error('Vendeur introuvable');
  }
  Object.entries(pick(req.body)).forEach(([k, v]) => (s[k] = v));
  await s.save();
  res.json(s);
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  const s = await Supplier.findById(req.params.id);
  if (!s) {
    res.status(404);
    throw new Error('Vendeur introuvable');
  }
  if (s.owner) {
    res.status(400);
    throw new Error('Cette boutique appartient à un vendeur : suspendez-la depuis « Boutiques » plutôt que de la supprimer');
  }
  await Product.updateMany({ supplier: s._id }, { supplier: null });
  await s.deleteOne();
  res.json({ message: 'Vendeur supprimé' });
});

// GET /api/suppliers/directory (public) — annuaire des vendeurs avec leurs statistiques
// Filtres : q (nom), verified=1, category
exports.directory = asyncHandler(async (req, res) => {
  const match = { supplier: { $ne: null }, published: { $ne: false } };
  if (req.query.category && /^[a-f\d]{24}$/i.test(req.query.category)) match.category = new (require('mongoose').Types.ObjectId)(req.query.category);
  const stats = await Product.aggregate([
    { $match: match },
    { $group: { _id: '$supplier', products: { $sum: 1 }, sold: { $sum: '$sold' }, categories: { $addToSet: '$category' } } },
  ]);
  const byId = new Map(stats.map((s) => [String(s._id), s]));
  const filter = { _id: { $in: stats.map((s) => s._id) }, status: { $nin: ['pending', 'suspended'] } };
  if (req.query.verified === '1') filter.verified = true;
  if (req.query.q && req.query.q.trim()) filter.name = { $regex: String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (req.query.market) {
    const m = await require('../models/Market').findOne({ slug: String(req.query.market) });
    filter.market = m ? m._id : null;
  }
  const list = await Supplier.find(filter).populate('market', 'name slug icon').lean();
  const cats = await Category.find({ _id: { $in: [...new Set(stats.flatMap((s) => s.categories.map(String)))] } }).select('name icon').lean();
  const catMap = new Map(cats.map((c) => [String(c._id), c]));
  res.json(
    list
      .map((s) => {
        const st = byId.get(String(s._id));
        return { ...s, products: st.products, sold: st.sold, categories: st.categories.map((c) => catMap.get(String(c))).filter(Boolean) };
      })
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.sold - a.sold)
  );
});

// GET /api/suppliers/:id/profile (public) — fiche d'un vendeur et ses statistiques
exports.profile = asyncHandler(async (req, res) => {
  const s = await Supplier.findById(req.params.id).populate('market', 'name slug icon color').lean();
  if (!s || ['pending', 'suspended'].includes(s.status)) {
    res.status(404);
    throw new Error('Vendeur introuvable');
  }
  const [agg] = await Product.aggregate([
    { $match: { supplier: s._id, published: { $ne: false } } },
    { $group: { _id: null, products: { $sum: 1 }, sold: { $sum: '$sold' }, categories: { $addToSet: '$category' } } },
  ]);
  const categories = agg ? await Category.find({ _id: { $in: agg.categories } }).select('name icon').lean() : [];
  res.json({ ...s, products: agg?.products || 0, sold: agg?.sold || 0, categories });
});
