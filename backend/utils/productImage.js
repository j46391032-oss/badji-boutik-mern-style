// Image d'un produit du catalogue : /produits/<nom-simplifié>.png (fichiers dans frontend/public/produits)
const EMOJIS = require('../data/product-emojis.json');

const slug = (name) =>
  String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Renvoie le chemin de l'image si on en a une pour ce nom de produit, sinon ''
const imagePath = (name) => (EMOJIS[name] ? `/produits/${slug(name)}.png` : '');

// Donne une image aux produits qui n'en ont pas encore (ne touche jamais une image déjà définie)
async function applyImages(Product) {
  let n = 0;
  const empty = await Product.find({ $or: [{ image: '' }, { image: null }, { image: { $exists: false } }] }).select('name');
  for (const p of empty) {
    const img = imagePath(p.name);
    if (img) {
      await Product.updateOne({ _id: p._id }, { $set: { image: img } });
      n++;
    }
  }
  return n;
}

module.exports = { slug, imagePath, applyImages, EMOJIS };
