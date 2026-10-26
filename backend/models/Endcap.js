const mongoose = require('mongoose');

// Tête de gondole : emplacement promotionnel en bout d'allée (promotion, marque partenaire, saison)
const endcapSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Le titre est obligatoire'], trim: true, maxlength: 80 },
    subtitle: { type: String, trim: true, maxlength: 160, default: '' },
    kind: { type: String, enum: ['promo', 'brand', 'seasonal'], default: 'promo' },
    brand: { type: String, trim: true, default: '' }, // marque partenaire (kind = brand)
    color: { type: String, default: '#08855c' },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    zones: [{ type: String, enum: ['fresh', 'grocery', 'general'] }], // affichée en bout de ces zones
    rayons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], // et/ou en bout de ces allées
    showOnStore: { type: Boolean, default: false }, // aussi sur le plan du magasin et l'accueil
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

endcapSchema.statics.activeFilter = (now = new Date()) => ({
  active: true,
  $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
});

module.exports = mongoose.model('Endcap', endcapSchema);
