const mongoose = require('mongoose');

// Bannières du carrousel de la page d'accueil
const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Le titre est obligatoire'], trim: true },
    subtitle: { type: String, trim: true, default: '' },
    cta: { type: String, trim: true, default: 'Découvrir' },
    link: { type: String, trim: true, default: '/produits' },
    image: { type: String, default: '' },
    color: { type: String, default: '#0a4733' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
