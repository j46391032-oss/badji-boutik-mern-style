// Têtes de gondole : emplacements promotionnels en bout d'allée (promotions, marques partenaires, saisons).
const Endcap = require('../models/Endcap');
const asyncHandler = require('../utils/asyncHandler');

const PRODUCT_FIELDS = 'name image price oldPrice stock published brand';

// Têtes de gondole actives (dates, activation) pour un rayon, une zone ou le plan du magasin ; produits publiés seulement
async function loadEndcaps({ rayon, zone, store } = {}) {
  const or = [];
  if (rayon) or.push({ rayons: rayon });
  if (zone) or.push({ zones: zone });
  if (store) or.push({ showOnStore: true });
  if (!or.length) return [];
  const list = await Endcap.find({ ...Endcap.activeFilter(), $or: or }).sort('order -createdAt').populate('products', PRODUCT_FIELDS).lean();
  return list
    .map((e) => ({ ...e, products: (e.products || []).filter((p) => p.published !== false).slice(0, 6) }))
    .filter((e) => e.products.length > 0);
}
exports.loadEndcaps = loadEndcaps;

// GET /api/endcaps?rayon=&zone=&store=1 (public)
exports.getEndcaps = asyncHandler(async (req, res) => {
  const { rayon, zone } = req.query;
  res.json(await loadEndcaps({ rayon: /^[a-f\d]{24}$/i.test(rayon || '') ? rayon : undefined, zone, store: req.query.store === '1' }));
});

// ───────── Administration (droit « produits »)
const clean = (b) => {
  const out = {};
  if (b.title !== undefined) out.title = String(b.title).trim();
  if (b.subtitle !== undefined) out.subtitle = String(b.subtitle).trim();
  if (b.kind !== undefined && ['promo', 'brand', 'seasonal'].includes(b.kind)) out.kind = b.kind;
  if (b.brand !== undefined) out.brand = String(b.brand).trim();
  if (b.color !== undefined && /^#[0-9a-f]{6}$/i.test(b.color)) out.color = b.color;
  if (Array.isArray(b.products)) out.products = [...new Set(b.products.map(String))].slice(0, 8);
  if (Array.isArray(b.zones)) out.zones = b.zones.filter((z) => ['fresh', 'grocery', 'general'].includes(z));
  if (Array.isArray(b.rayons)) out.rayons = [...new Set(b.rayons.map(String))];
  if (b.showOnStore !== undefined) out.showOnStore = Boolean(b.showOnStore);
  if (b.active !== undefined) out.active = Boolean(b.active);
  if (b.order !== undefined) out.order = Number(b.order) || 0;
  ['startsAt', 'endsAt'].forEach((k) => {
    if (b[k] !== undefined) out[k] = b[k] ? new Date(b[k]) : null;
  });
  return out;
};

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await Endcap.find().sort('order -createdAt').populate('products', 'name image price').populate('rayons', 'name icon'));
});

exports.create = asyncHandler(async (req, res) => {
  const data = clean(req.body);
  if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
    res.status(400);
    throw new Error('La date de fin doit suivre la date de début');
  }
  res.status(201).json(await Endcap.create(data));
});

exports.update = asyncHandler(async (req, res) => {
  const e = await Endcap.findById(req.params.id);
  if (!e) {
    res.status(404);
    throw new Error('Tête de gondole introuvable');
  }
  Object.assign(e, clean(req.body));
  if (e.startsAt && e.endsAt && e.endsAt < e.startsAt) {
    res.status(400);
    throw new Error('La date de fin doit suivre la date de début');
  }
  await e.save();
  res.json(e);
});

exports.remove = asyncHandler(async (req, res) => {
  const e = await Endcap.findByIdAndDelete(req.params.id);
  if (!e) {
    res.status(404);
    throw new Error('Tête de gondole introuvable');
  }
  res.json({ message: 'Tête de gondole supprimée' });
});
