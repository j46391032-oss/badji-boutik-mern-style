// Charge le catalogue (catégories, vendeurs, produits) SANS rien effacer.
// Un produit déjà présent (même nom) n'est pas dupliqué : seuls ses champs vides sont complétés.
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const { SUPPLIERS, PRODUCTS } = require('../data/catalog');
const { imagePath, applyImages } = require('./productImage');
const ensureMarkets = require('./ensureMarkets');
const ensureStore = require('./ensureStore');
const seedEndcaps = require('./seedEndcaps');

const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function toProduct(p, catId, supId, position) {
  const h = hash(p.name);
  return {
    name: p.name,
    brand: p.brand || '',
    description: p.d || '',
    image: imagePath(p.name),
    bay: p.by || '', // travée du planogramme
    position, // place dans le rayon (ordre du catalogue)
    price: p.price,
    oldPrice: p.o || 0,
    stock: p.st ?? 10 + (h % 70),
    sold: p.so ?? 15 + ((h >> 3) % 600),
    moq: p.moq || 1,
    priceTiers: (p.t || []).map(([minQty, price]) => ({ minQty, price })),
    specs: (p.sp || []).map(([label, value]) => ({ label, value })),
    options: Object.entries(p.op || {}).map(([name, values]) => ({ name, values })),
    sampleAvailable: Boolean(p.sm),
    freeShipping: Boolean(p.fr),
    featured: Boolean(p.ft),
    flashSaleEnds: p.fl ? new Date(Date.now() + p.fl * 86400000) : null,
    category: catId,
    supplier: supId,
  };
}

async function loadCatalog({ log = () => {} } = {}) {
  await ensureStore(); // crée les rayons (zones, allées, travées) avant les produits
  const cat = {};
  for (const name of new Set(PRODUCTS.map((p) => p.category))) cat[name] = (await Category.findOne({ name }))._id;
  const sup = {};
  for (const s of SUPPLIERS) {
    const d = await Supplier.findOneAndUpdate({ name: s.name }, { $setOnInsert: s }, { new: true, upsert: true });
    sup[s.name] = d._id;
  }

  const nextPos = {};
  let added = 0;
  let completed = 0;
  let skipped = 0;
  for (const p of PRODUCTS) {
    const position = (nextPos[p.category] = (nextPos[p.category] || 0) + 1);
    const data = toProduct(p, cat[p.category], sup[p.supplier], position);
    const existing = await Product.findOne({ name: p.name });
    if (!existing) {
      await Product.create(data);
      added++;
      continue;
    }
    const patch = {};
    if (!existing.supplier) patch.supplier = data.supplier;
    if (!existing.brand) patch.brand = data.brand;
    if (!existing.description) patch.description = data.description;
    if (!existing.specs?.length && data.specs.length) patch.specs = data.specs;
    if (!existing.priceTiers?.length && data.priceTiers.length) patch.priceTiers = data.priceTiers;
    if (!existing.options?.length && data.options.length) patch.options = data.options;
    if (!existing.sampleAvailable && data.sampleAvailable) patch.sampleAvailable = true;
    if (!existing.bay && data.bay) patch.bay = data.bay;
    if ((existing.position ?? 1000000) >= 1000000) patch.position = data.position; // jamais écraser un planogramme déjà réglé
    if (Object.keys(patch).length) {
      await Product.updateOne({ _id: existing._id }, { $set: patch });
      completed++;
    } else skipped++;
  }
  const withImage = await applyImages(Product); // images des produits déjà présents (seed ou admin) qui n'en ont pas
  await seedEndcaps(); // têtes de gondole de démonstration (une seule fois)
  await ensureMarkets(); // lie les catégories du catalogue aux cinq marchés
  log(`${withImage} image(s) ajoutée(s) — ${added} produit(s) ajouté(s), ${completed} complété(s), ${skipped} déjà à jour — ${CATEGORIES.length} catégories, ${SUPPLIERS.length} vendeurs.`);
  return { added, completed, skipped, images: withImage };
}

module.exports = loadCatalog;
