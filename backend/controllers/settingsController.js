const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/settings — public (frais de livraison, bandeau, contacts…)
exports.getSettings = asyncHandler(async (req, res) => res.json(await Settings.get()));

// PUT /api/settings (admin)
exports.updateSettings = asyncHandler(async (req, res) => {
  const s = await Settings.get();
  ['shopName', 'announcement', 'shippingFee', 'freeShippingThreshold', 'returnDays', 'supportPhone', 'supportEmail', 'lowStockThreshold', 'commissionRate', 'autoApproveShops'].forEach((f) => {
    if (req.body[f] !== undefined) s[f] = req.body[f];
  });
  await s.save();
  res.json(s);
});
