const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');
const Market = require('../models/Market');
const { isStaff, can } = require('../utils/permissions');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  new: '-createdAt',
  price_asc: 'price',
  price_desc: '-price',
  best: '-sold -ratingCount',
  rating: '-ratingAvg -ratingCount',
  flash: 'flashSaleEnds',
  aisle: 'position -sold', // ordre du planogramme (celui des rayons du magasin)
};

// GET /api/products
// Filtres : scope (official|market), market (slug), zone (fresh|grocery|general), search, category, ids, minPrice, maxPrice, minRating, freeShipping=1, inStock=1, promo=1, flash=1,
//           featured=1, supplier, sort (new|price_asc|price_desc|best|rating|flash)
// Admin (token + all=1) : produits masqués inclus (published=0 : seulement les masqués), stockFilter=low|out
// Sans page : renvoie un tableau (limit facultatif). Avec page : { items, total, page, pages }
exports.getProducts = asyncHandler(async (req, res) => {
  const q = req.query;
  const isAdmin = can(req.user, 'produits') || Boolean(req.shop); // l'espace vendeur voit aussi ses produits masqués
  const filter = {};
  const and = [];

  if (!(isAdmin && q.all === '1')) filter.published = { $ne: false };
  if (q.search && q.search.trim()) {
    const rx = { $regex: escapeRegex(q.search.trim()), $options: 'i' };
    and.push({ $or: [{ name: rx }, { brand: rx }, { description: rx }] });
  }
  if (q.category) filter.category = q.category;
  else if (q.zone && ['fresh', 'grocery', 'general'].includes(q.zone)) filter.category = { $in: await Category.find({ zone: q.zone }).distinct('_id') }; // une zone du magasin
  if (q.brand) filter.brand = { $regex: `^${escapeRegex(String(q.brand).trim())}$`, $options: 'i' };
  if (Number(q.maxMoq) > 0) filter.moq = { $lte: Number(q.maxMoq) }; // quantité minimum de commande (MOQ) acceptable
  if (q.samples === '1') filter.sampleAvailable = true;
  if (q.verified === '1') filter.supplier = { $in: await Supplier.find({ verified: true }).distinct('_id') };
  if (q.supplier && q.verified !== '1') filter.supplier = q.supplier;
  // Deux parties : la boutique officielle (scope=official) et les marchés des vendeurs (scope=market, ou market=<marché>)
  if (q.scope === 'official') filter.origin = { $ne: 'market' };
  if (q.scope === 'market') filter.origin = 'market';
  if (q.market) {
    const m = await Market.findOne(/^[a-f\d]{24}$/i.test(q.market) ? { _id: q.market } : { slug: String(q.market) });
    filter.market = m ? m._id : new (require('mongoose').Types.ObjectId)(); // marché inconnu : aucun résultat
    filter.origin = 'market';
  }
  if (q.ids) filter._id = { $in: String(q.ids).split(',').filter(Boolean).slice(0, 50) };

  const min = Number(q.minPrice);
  const max = Number(q.maxPrice);
  if (q.minPrice !== undefined && q.minPrice !== '' && !Number.isNaN(min)) filter.price = { ...filter.price, $gte: min };
  if (q.maxPrice !== undefined && q.maxPrice !== '' && !Number.isNaN(max)) filter.price = { ...filter.price, $lte: max };
  if (Number(q.minRating) > 0) filter.ratingAvg = { $gte: Number(q.minRating) };
  if (q.freeShipping === '1') filter.freeShipping = true;
  if (q.inStock === '1') filter.stock = { $gt: 0 };
  if (q.promo === '1') and.push({ $expr: { $gt: ['$oldPrice', '$price'] } });
  if (q.flash === '1') filter.flashSaleEnds = { $gt: new Date() };
  if (q.featured === '1') filter.featured = true;
  if (isAdmin && q.all === '1' && q.published === '0') filter.published = false;
  if (isAdmin && q.stockFilter === 'out') filter.stock = 0;
  if (isAdmin && q.stockFilter === 'low') {
    const { lowStockThreshold } = await Settings.get();
    filter.stock = { $gt: 0, $lte: lowStockThreshold };
  }
  if (and.length) filter.$and = and;

  const sort = SORTS[q.sort] || SORTS.new;
  const query = Product.find(filter).populate('category', 'name icon slug zone aisle').populate('supplier', 'name verified').populate('market', 'name slug icon color').sort(sort);

  if (q.page) {
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 12, 1), 60);
    const total = await Product.countDocuments(filter);
    const pages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(Math.max(parseInt(q.page, 10) || 1, 1), pages);
    const items = await query.skip((page - 1) * limit).limit(limit);
    return res.json({ items, total, page, pages });
  }
  if (q.limit) query.limit(Math.min(Math.max(parseInt(q.limit, 10) || 12, 1), 100));
  res.json(await query);
});

// GET /api/products/suggest?q= — suggestions de recherche (produits, catégories, marques)
exports.suggest = asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.json({ products: [], categories: [], brands: [] });
  const rx = { $regex: escapeRegex(term), $options: 'i' };
  const [products, categories, brands] = await Promise.all([
    Product.find({ published: { $ne: false }, $or: [{ name: rx }, { brand: rx }] })
      .sort('-sold')
      .limit(6)
      .select('name price image category')
      .populate('category', 'name icon slug zone aisle'),
    Category.find({ name: rx }).limit(3).select('name icon'),
    Product.distinct('brand', { published: { $ne: false }, brand: rx }),
  ]);
  res.json({ products, categories, brands: brands.filter(Boolean).slice(0, 3) });
});

// GET /api/products/:id
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name icon slug zone aisle').populate('supplier').populate('market', 'name slug icon color');
  if (!product || (product.published === false && !can(req.user, 'produits'))) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  res.json(product);
});

// GET /api/products/:id/related — « Autres recommandations » (même catégorie d'abord)
exports.getRelated = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  const base = { _id: { $ne: product._id }, published: { $ne: false } };
  let list = await Product.find({ ...base, category: product.category }).sort('-sold -ratingAvg').limit(8).populate('category', 'name icon slug zone aisle');
  if (list.length < 6) {
    const more = await Product.find({ ...base, _id: { $nin: [product._id, ...list.map((p) => p._id)] } })
      .sort('-sold')
      .limit(8 - list.length)
      .populate('category', 'name icon slug zone aisle');
    list = list.concat(more);
  }
  res.json(list);
});

const num = (v, d = 0) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));

// Nettoie les données envoyées par le formulaire d'administration
function clean(body, partial = false) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  ['name', 'description', 'brand', 'image', 'category'].forEach((k) => has(k) && (out[k] = body[k]));
  if (has('supplier')) out.supplier = body.supplier || null;
  ['price', 'stock'].forEach((k) => has(k) && (out[k] = num(body[k], undefined)));
  if (has('oldPrice')) out.oldPrice = num(body.oldPrice, 0);
  if (has('moq')) out.moq = Math.max(1, Math.floor(num(body.moq, 1)));
  if (has('sold')) out.sold = Math.max(0, Math.floor(num(body.sold, 0)));
  ['freeShipping', 'featured', 'published', 'sampleAvailable'].forEach((k) => has(k) && (out[k] = Boolean(body[k])));
  if (has('flashSaleEnds')) out.flashSaleEnds = body.flashSaleEnds ? new Date(body.flashSaleEnds) : null;
  if (has('images')) out.images = [...new Set((body.images || []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 8);
  if (has('specs')) out.specs = (body.specs || []).filter((s) => s && s.label && s.value).map((s) => ({ label: String(s.label).trim(), value: String(s.value).trim() })).slice(0, 30);
  if (has('options')) {
    out.options = (body.options || [])
      .map((o) => ({ name: String(o?.name || '').trim(), values: [...new Set((o?.values || []).map((v) => String(v).trim()).filter(Boolean))].slice(0, 30) }))
      .filter((o) => o.name && o.values.length)
      .slice(0, 5);
  }
  if (has('priceTiers')) {
    const seen = new Set();
    out.priceTiers = (body.priceTiers || [])
      .map((t) => ({ minQty: Math.floor(num(t.minQty)), price: num(t.price, NaN) }))
      .filter((t) => t.minQty >= 2 && t.price >= 0 && !seen.has(t.minQty) && seen.add(t.minQty))
      .sort((a, b) => a.minQty - b.minQty);
  }
  return out;
}

function checkPricing(data, current = {}) {
  const price = data.price ?? current.price;
  const oldPrice = data.oldPrice ?? current.oldPrice ?? 0;
  if (oldPrice > 0 && oldPrice <= price) return "L'ancien prix doit être supérieur au prix actuel";
  return null;
}

// POST /api/products (admin)
exports.createProduct = asyncHandler(async (req, res) => {
  const data = clean(req.body);
  const problem = checkPricing(data);
  if (problem) {
    res.status(400);
    throw new Error(problem);
  }
  const product = await Product.create(data);
  res.status(201).json(await product.populate([{ path: 'category', select: 'name icon' }, { path: 'supplier', select: 'name verified' }]));
});

// PUT /api/products/:id (admin)
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  const data = clean(req.body);
  const problem = checkPricing(data, product);
  if (problem) {
    res.status(400);
    throw new Error(problem);
  }
  Object.entries(data).forEach(([k, v]) => (product[k] = v));
  await product.save();
  res.json(await product.populate([{ path: 'category', select: 'name icon' }, { path: 'supplier', select: 'name verified' }]));
});

// POST /api/products/:id/duplicate (admin) — copie masquée, à compléter
exports.duplicateProduct = asyncHandler(async (req, res) => {
  const src = await Product.findById(req.params.id);
  if (!src) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  const copy = src.toObject();
  delete copy._id;
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  Object.assign(copy, { name: `${src.name} (copie)`, published: false, sold: 0, ratingAvg: 0, ratingCount: 0, flashSaleEnds: null });
  res.status(201).json(await (await Product.create(copy)).populate('category', 'name icon slug zone aisle'));
});

// DELETE /api/products/:id (admin)
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  await product.deleteOne();
  res.json({ message: 'Produit supprimé' });
});

// POST /api/products/upload (admin) — envoi d'une image (produits, bannières…)
exports.uploadImage = (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Aucune image reçue');
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
};
exports.cleanProduct = clean;
exports.checkPricing = checkPricing;
