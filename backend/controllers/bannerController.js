const Banner = require('../models/Banner');
const { isStaff, can } = require('../utils/permissions');
const asyncHandler = require('../utils/asyncHandler');

const FIELDS = ['title', 'subtitle', 'cta', 'link', 'image', 'color', 'order', 'active'];
const pick = (body) => {
  const out = {};
  FIELDS.forEach((f) => body[f] !== undefined && (out[f] = body[f]));
  return out;
};

// GET /api/banners — actives pour le public ; toutes pour l'admin avec ?all=1
exports.getBanners = asyncHandler(async (req, res) => {
  const filter = req.query.all === '1' && can(req.user, 'produits') ? {} : { active: true };
  res.json(await Banner.find(filter).sort('order createdAt'));
});

exports.createBanner = asyncHandler(async (req, res) => res.status(201).json(await Banner.create(pick(req.body))));

exports.updateBanner = asyncHandler(async (req, res) => {
  const b = await Banner.findById(req.params.id);
  if (!b) {
    res.status(404);
    throw new Error('Bannière introuvable');
  }
  Object.entries(pick(req.body)).forEach(([k, v]) => (b[k] = v));
  await b.save();
  res.json(b);
});

exports.deleteBanner = asyncHandler(async (req, res) => {
  const b = await Banner.findById(req.params.id);
  if (!b) {
    res.status(404);
    throw new Error('Bannière introuvable');
  }
  await b.deleteOne();
  res.json({ message: 'Bannière supprimée' });
});
