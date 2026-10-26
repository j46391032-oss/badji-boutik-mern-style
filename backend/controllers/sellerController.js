// Espace vendeur : chaque vendeur gère sa boutique, ses produits, ses commandes et suit ses commissions.
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Settlement = require('../models/Settlement');
const Market = require('../models/Market');
const { cleanProduct, checkPricing } = require('./productController');
const { shopLedger, commissionRateFor } = require('../utils/shop');
const asyncHandler = require('../utils/asyncHandler');

const shopView = async (shop) => {
  const settings = await Settings.get();
  const market = shop.market ? await Market.findById(shop.market).populate('categories', 'name icon') : null;
  return { ...shop.toJSON(), market: market ? market.toJSON() : null, effectiveCommission: commissionRateFor(shop, settings) };
};

const findMarket = async (ref) => {
  if (!ref) return null;
  const key = String(ref);
  return Market.findOne({ active: true, ...(/^[a-f\d]{24}$/i.test(key) ? { _id: key } : { slug: key }) });
};

// Dans un marché, on ne vend que les catégories de ce marché (comme les étals d'un vrai marché)
const checkCategory = async (res, shop, category) => {
  if (!shop.market || !category) return;
  const market = await Market.findById(shop.market).populate('categories', 'name');
  if (!market || market.categories.length === 0) return;
  if (!market.categories.some((c) => String(c._id) === String(category))) {
    res.status(400);
    throw new Error(`${market.name} ne vend que : ${market.categories.map((c) => c.name).join(', ')}`);
  }
};

// POST /api/seller/shop — n'importe quel client peut ouvrir sa boutique (une par compte)
exports.createShop = asyncHandler(async (req, res) => {
  if (req.user.role !== 'client') {
    res.status(403);
    throw new Error('Les comptes administrateur ne peuvent pas ouvrir de boutique');
  }
  if (req.user.shop) {
    res.status(400);
    throw new Error('Vous avez déjà une boutique');
  }
  const name = String(req.body.name || '').trim();
  if (name.length < 3) {
    res.status(400);
    throw new Error('Le nom de la boutique doit contenir au moins 3 caractères');
  }
  const taken = await Supplier.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
  if (taken) {
    res.status(400);
    throw new Error('Ce nom de boutique est déjà pris');
  }
  const market = await findMarket(req.body.market);
  if (!market) {
    res.status(400);
    throw new Error('Choisissez le marché où ouvrir votre boutique');
  }
  const settings = await Settings.get();
  const shop = await Supplier.create({
    name,
    owner: req.user._id,
    market: market._id,
    status: settings.autoApproveShops ? 'approved' : 'pending',
    description: String(req.body.description || '').slice(0, 1000),
    city: String(req.body.city || '').trim(),
    phone: String(req.body.phone || req.user.phone || '').trim(),
    logo: String(req.body.logo || ''),
    verified: false,
    rating: 0,
    yearsActive: 0,
    responseHours: 24,
    onTimeRate: 0,
    repurchaseRate: 0,
  });
  await User.updateOne({ _id: req.user._id }, { shop: shop._id });
  res.status(201).json(await shopView(shop));
});

// GET /api/seller/shop
exports.getShop = asyncHandler(async (req, res) => res.json(await shopView(req.shop)));

// PUT /api/seller/shop
exports.updateShop = asyncHandler(async (req, res) => {
  const shop = req.shop;
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (name.length < 3) {
      res.status(400);
      throw new Error('Le nom de la boutique doit contenir au moins 3 caractères');
    }
    const taken = await Supplier.findOne({ _id: { $ne: shop._id }, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (taken) {
      res.status(400);
      throw new Error('Ce nom de boutique est déjà pris');
    }
    shop.name = name;
  }
  if (req.body.market !== undefined) {
    const market = await findMarket(req.body.market);
    if (!market) {
      res.status(400);
      throw new Error('Marché inconnu');
    }
    if (String(market._id) !== String(shop.market)) {
      if (await Product.exists({ supplier: shop._id })) {
        res.status(400);
        throw new Error('Vous avez déjà des produits : contactez l’administrateur pour changer de marché');
      }
      shop.market = market._id;
    }
  }
  ['description', 'city', 'phone', 'logo'].forEach((k) => req.body[k] !== undefined && (shop[k] = String(req.body[k]).slice(0, 1000)));
  if (Array.isArray(req.body.markets)) shop.markets = req.body.markets.map((m) => String(m).trim()).filter(Boolean).slice(0, 12);
  await shop.save();
  res.json(await shopView(shop));
});

// ───────── Produits (limités à la boutique)
// GET /api/seller/products : même liste filtrable que le catalogue, limitée à la boutique (voir routes)
exports.scopeProducts = (req, res, next) => {
  req.query.supplier = String(req.shop._id);
  delete req.query.verified;
  next();
};

const ownProduct = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, supplier: req.shop._id });
  if (!product) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  return product;
};

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await ownProduct(req, res);
  res.json(await product.populate([{ path: 'category', select: 'name icon' }, { path: 'supplier', select: 'name verified' }]));
});

// Le vendeur ne choisit ni la mise en avant, ni la boutique, ni le compteur de ventes
const sellerData = (body) => {
  const data = cleanProduct(body);
  delete data.featured;
  delete data.sold;
  delete data.supplier;
  delete data.hiddenByAdmin;
  return data;
};

exports.createProduct = asyncHandler(async (req, res) => {
  const data = sellerData(req.body);
  await checkCategory(res, req.shop, data.category);
  const problem = checkPricing(data);
  if (problem) {
    res.status(400);
    throw new Error(problem);
  }
  const product = await Product.create({ ...data, supplier: req.shop._id });
  res.status(201).json(await product.populate([{ path: 'category', select: 'name icon' }, { path: 'supplier', select: 'name verified' }]));
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await ownProduct(req, res);
  const data = sellerData(req.body);
  if (data.category !== undefined && String(data.category) !== String(product.category)) await checkCategory(res, req.shop, data.category);
  const problem = checkPricing(data, product);
  if (problem) {
    res.status(400);
    throw new Error(problem);
  }
  Object.entries(data).forEach(([k, v]) => (product[k] = v));
  await product.save();
  res.json(await product.populate([{ path: 'category', select: 'name icon' }, { path: 'supplier', select: 'name verified' }]));
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await ownProduct(req, res);
  await product.deleteOne();
  res.json({ message: 'Produit supprimé' });
});

// ───────── Tableau de bord
// GET /api/seller/stats
exports.getStats = asyncHandler(async (req, res) => {
  const settings = await Settings.get();
  const shopId = req.shop._id;
  const since = new Date(Date.now() - 13 * 86400000);
  since.setHours(0, 0, 0, 0);
  const [products, lowStock, outOfStock, byStatus, daily, top, openInquiries, ledger] = await Promise.all([
    Product.countDocuments({ supplier: shopId }),
    Product.countDocuments({ supplier: shopId, stock: { $gt: 0, $lte: settings.lowStockThreshold || 5 } }),
    Product.countDocuments({ supplier: shopId, stock: { $lte: 0 } }),
    Order.aggregate([{ $match: { seller: shopId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { seller: shopId, status: { $ne: 'Annulée' }, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { seller: shopId, status: { $ne: 'Annulée' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
    Inquiry.countDocuments({ supplier: shopId, unreadByAdmin: true }),
    shopLedger(shopId),
  ]);
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const row = daily.find((d) => d._id === key);
    days.push({ date: key, total: row?.total || 0, orders: row?.orders || 0 });
  }
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  res.json({ shop: await shopView(req.shop), products, lowStock, outOfStock, counts, pendingOrders: counts['En attente'] || 0, openInquiries, daily: days, top, ledger });
});

// GET /api/seller/earnings — ventes, commission et reversements
exports.getEarnings = asyncHandler(async (req, res) => {
  const [ledger, settlements] = await Promise.all([shopLedger(req.shop._id), Settlement.find({ shop: req.shop._id }).sort('-createdAt').limit(100)]);
  res.json({ ledger, settlements, commissionRate: (await shopView(req.shop)).effectiveCommission });
});
