const Coupon = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');
const { evaluateCoupon } = require('../utils/coupon');

// POST /api/coupons/validate — aperçu de la remise pour le panier (le serveur recalcule à la commande)
exports.validateCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal) || 0;
  const coupon = code ? await Coupon.findOne({ code }) : null;
  const r = evaluateCoupon(coupon, subtotal);
  if (!r.ok) {
    res.status(400);
    throw new Error(r.message);
  }
  res.json({ code: coupon.code, type: coupon.type, value: coupon.value, discount: r.discount });
});

// --- Administration ---
exports.getCoupons = asyncHandler(async (req, res) => res.json(await Coupon.find().sort('-createdAt')));

exports.createCoupon = asyncHandler(async (req, res) => {
  const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
  res.status(201).json(await Coupon.create({ code, type, value, minOrder, maxUses, expiresAt: expiresAt || null }));
});

exports.updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('Code promo introuvable');
  }
  ['active', 'value', 'minOrder', 'maxUses', 'expiresAt'].forEach((f) => {
    if (req.body[f] !== undefined) coupon[f] = req.body[f] === '' ? null : req.body[f];
  });
  await coupon.save();
  res.json(coupon);
});

exports.deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error('Code promo introuvable');
  }
  await coupon.deleteOne();
  res.json({ message: 'Code promo supprimé' });
});
