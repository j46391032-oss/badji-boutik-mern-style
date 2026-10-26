// Administration des boutiques de vendeurs : validation, suspension, commission, reversements.
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Settlement = require('../models/Settlement');
const Market = require('../models/Market');
const Settings = require('../models/Settings');
const { shopLedger, commissionRateFor } = require('../utils/shop');
const asyncHandler = require('../utils/asyncHandler');

const find = async (req, res) => {
  const shop = await Supplier.findOne({ _id: req.params.id, owner: { $ne: null } });
  if (!shop) {
    res.status(404);
    throw new Error('Boutique introuvable');
  }
  return shop;
};

// GET /api/shops — toutes les boutiques de vendeurs, avec leur propriétaire et ce qu'elles doivent
exports.getShops = asyncHandler(async (req, res) => {
  const filter = { owner: { $ne: null } };
  if (req.query.status) filter.status = req.query.status;
  const settings = await Settings.get();
  const shops = await Supplier.find(filter).sort('-createdAt').populate('owner', 'name email phone').populate('market', 'name slug icon');
  const rows = await Promise.all(
    shops.map(async (s) => ({
      ...s.toJSON(),
      effectiveCommission: commissionRateFor(s, settings),
      products: await Product.countDocuments({ supplier: s._id }),
      ledger: await shopLedger(s._id),
    }))
  );
  res.json(rows);
});

// PUT /api/shops/:id/status — approuver, suspendre ou remettre en attente
// Suspendre masque les produits de la boutique ; la réactiver les remet en ligne (sauf ceux masqués par le vendeur)
exports.setStatus = asyncHandler(async (req, res) => {
  const shop = await find(req, res);
  const { status } = req.body;
  if (!['pending', 'approved', 'suspended'].includes(status)) {
    res.status(400);
    throw new Error('Statut invalide');
  }
  shop.status = status;
  await shop.save();
  if (status === 'approved') await Product.updateMany({ supplier: shop._id, hiddenByAdmin: true }, { published: true, hiddenByAdmin: false });
  else await Product.updateMany({ supplier: shop._id, published: { $ne: false } }, { published: false, hiddenByAdmin: true });
  res.json(shop);
});

// PUT /api/shops/:id — commission (vide = taux des réglages) et badge « vérifié »
exports.updateShop = asyncHandler(async (req, res) => {
  const shop = await find(req, res);
  if (req.body.commissionRate !== undefined) {
    const raw = req.body.commissionRate;
    const rate = raw === '' || raw === null ? null : Number(raw);
    if (rate !== null && !(rate >= 0 && rate <= 50)) {
      res.status(400);
      throw new Error('La commission doit être comprise entre 0 et 50 %');
    }
    shop.commissionRate = rate;
  }
  if (req.body.verified !== undefined) shop.verified = Boolean(req.body.verified);
  if (req.body.market !== undefined) {
    const market = await Market.findById(req.body.market);
    if (!market) {
      res.status(400);
      throw new Error('Marché inconnu');
    }
    shop.market = market._id;
    await Product.updateMany({ supplier: shop._id }, { market: market._id }); // les produits suivent la boutique
  }
  await shop.save();
  res.json(shop);
});

// GET /api/shops/:id/ledger
exports.getLedger = asyncHandler(async (req, res) => {
  const shop = await find(req, res);
  res.json({ ledger: await shopLedger(shop._id), settlements: await Settlement.find({ shop: shop._id }).sort('-createdAt').limit(200) });
});

// POST /api/shops/:id/settlements — enregistre un reversement de commission reçu du vendeur
exports.addSettlement = asyncHandler(async (req, res) => {
  const shop = await find(req, res);
  const amount = Math.round(Number(req.body.amount));
  if (!(amount > 0)) {
    res.status(400);
    throw new Error('Le montant doit être positif');
  }
  const settlement = await Settlement.create({ shop: shop._id, amount, method: req.body.method, note: req.body.note, recordedBy: req.user._id });
  res.status(201).json({ settlement, ledger: await shopLedger(shop._id) });
});

exports.deleteSettlement = asyncHandler(async (req, res) => {
  const shop = await find(req, res);
  const s = await Settlement.findOneAndDelete({ _id: req.params.settlementId, shop: shop._id });
  if (!s) {
    res.status(404);
    throw new Error('Reversement introuvable');
  }
  res.json({ ledger: await shopLedger(shop._id) });
});
