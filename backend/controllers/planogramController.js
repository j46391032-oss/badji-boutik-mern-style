// Planogramme : l'administrateur fixe, rayon par rayon, la travée et la place exacte de chaque produit.
// Le site affiche ensuite les produits du rayon dans cet ordre, pour tous les visiteurs.
const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

const OFFICIAL = { origin: { $ne: 'market' } };
const FIELDS = 'name image price stock bay position published sold';

const load = async (req, res) => {
  const cat = await Category.findById(req.params.categoryId);
  if (!cat) {
    res.status(404);
    throw new Error('Rayon introuvable');
  }
  return cat;
};
const view = async (cat) => ({
  rayon: { _id: cat._id, name: cat.name, icon: cat.icon, zone: cat.zone, aisle: cat.aisle, bays: cat.bays, slug: cat.slug },
  items: await Product.find({ ...OFFICIAL, category: cat._id }).sort('position name').select(FIELDS),
});

// GET /api/planogram/:categoryId — les produits du rayon dans l'ordre actuel
exports.getPlanogram = asyncHandler(async (req, res) => res.json(await view(await load(req, res))));

// PUT /api/planogram/:categoryId { bays?: [...], items: [{ id, bay }] } — l'ordre du tableau = l'ordre sur l'étagère
exports.savePlanogram = asyncHandler(async (req, res) => {
  const cat = await load(req, res);
  if (Array.isArray(req.body.bays)) cat.bays = req.body.bays.map((b) => String(b).trim()).filter(Boolean).slice(0, 12);
  const current = await Product.find({ ...OFFICIAL, category: cat._id }).select('_id');
  const ids = new Set(current.map((p) => String(p._id)));
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const seen = new Set();
  const placed = [];
  for (const it of items) {
    const id = String(it?.id || '');
    if (!ids.has(id)) {
      res.status(400);
      throw new Error("Un produit n'appartient pas à ce rayon de la boutique officielle");
    }
    if (seen.has(id)) continue;
    seen.add(id);
    placed.push({ id, bay: cat.bays.includes(it.bay) ? it.bay : '' });
  }
  // les produits oubliés dans la demande gardent leur ordre, après les autres
  for (const p of current) if (!seen.has(String(p._id))) placed.push({ id: String(p._id), bay: null });
  await cat.save();
  await Product.bulkWrite(
    placed.map((p, i) => ({ updateOne: { filter: { _id: p.id }, update: { $set: { position: i + 1, ...(p.bay === null ? {} : { bay: p.bay }) } } } }))
  );
  res.json(await view(cat));
});

// POST /api/planogram/:categoryId/auto — range automatiquement : par travée (dans l'ordre des travées), puis meilleures ventes
exports.autoPlan = asyncHandler(async (req, res) => {
  const cat = await load(req, res);
  const products = await Product.find({ ...OFFICIAL, category: cat._id }).sort('-sold name').select('_id bay');
  const rank = (b) => (cat.bays.includes(b) ? cat.bays.indexOf(b) : cat.bays.length);
  const sorted = [...products].sort((a, b) => rank(a.bay) - rank(b.bay));
  await Product.bulkWrite(sorted.map((p, i) => ({ updateOne: { filter: { _id: p._id }, update: { $set: { position: i + 1 } } } })));
  res.json(await view(cat));
});
