const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/categories — avec le nombre de produits visibles (menus et filtres)
exports.getCategories = asyncHandler(async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find().sort('zone aisle name').lean(),
    Product.aggregate([{ $match: { published: { $ne: false } } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json(cats.map((c) => ({ ...c, layout: c.layout || (c.zone === 'general' ? 'free' : 'grid'), count: map.get(String(c._id)) || 0 })));
});

// POST /api/categories (admin)
// Champs du plan du magasin : zone, allée, affichage, travées
const storeFields = (b) => {
  const out = {};
  if (b.zone !== undefined && ['fresh', 'grocery', 'general', ''].includes(b.zone)) out.zone = b.zone;
  if (b.aisle !== undefined) out.aisle = Math.max(0, parseInt(b.aisle, 10) || 0);
  if (b.layout !== undefined && ['grid', 'free', ''].includes(b.layout)) out.layout = b.layout;
  if (b.bays !== undefined) out.bays = [].concat(b.bays).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
  return out;
};

exports.createCategory = asyncHandler(async (req, res) => {
  res.status(201).json(await Category.create({ name: req.body.name, icon: req.body.icon || '', ...storeFields(req.body) }));
});

// PUT /api/categories/:id (admin)
exports.updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) {
    res.status(404);
    throw new Error('Catégorie introuvable');
  }
  if (req.body.name !== undefined) cat.name = req.body.name;
  if (req.body.icon !== undefined) cat.icon = req.body.icon;
  Object.assign(cat, storeFields(req.body));
  await cat.save();
  res.json(cat);
});

// DELETE /api/categories/:id (admin)
exports.deleteCategory = asyncHandler(async (req, res) => {
  if (await Product.exists({ category: req.params.id })) {
    res.status(400);
    throw new Error('Impossible de supprimer : des produits utilisent cette catégorie');
  }
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Catégorie supprimée' });
});
