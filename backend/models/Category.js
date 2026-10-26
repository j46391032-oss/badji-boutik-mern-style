const mongoose = require('mongoose');

const slugify = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Un rayon du magasin. La zone et le numéro d'allée placent le rayon sur le plan (voir utils/ensureStore.js).
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Le nom de la catégorie est obligatoire'], unique: true, trim: true },
    icon: { type: String, trim: true, default: '' }, // emoji affiché dans les menus
    slug: { type: String, trim: true, lowercase: true, index: true }, // adresse du rayon : /rayon/<slug>
    // fresh : périmètre (alimentation fraîche) · grocery : allées centrales (épicerie sèche) · general : marchandises générales
    zone: { type: String, enum: ['fresh', 'grocery', 'general', ''], default: '' },
    aisle: { type: Number, default: 0 }, // numéro d'allée dans la zone (ordre de parcours)
    layout: { type: String, enum: ['grid', 'free', ''], default: '' }, // grille (allées droites) ou plan libre ; vide : selon la zone
    bays: { type: [String], default: [] }, // travées du rayon (sections d'étagères) utilisées par le planogramme
  },
  { timestamps: true }
);

categorySchema.pre('validate', function (next) {
  if (!this.slug || this.isModified('name')) this.slug = slugify(this.name);
  next();
});

categorySchema.virtual('effectiveLayout').get(function () {
  return this.layout || (this.zone === 'general' ? 'free' : 'grid');
});
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);
module.exports.slugify = slugify;
