const mongoose = require('mongoose');

// Vendeur / fournisseur affiché sur la fiche produit (style Alibaba)
const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Le nom du vendeur est obligatoire'], unique: true, trim: true },
    verified: { type: Boolean, default: false },
    city: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'Sénégal' },
    yearsActive: { type: Number, min: 0, default: 1 },
    rating: { type: Number, min: 0, max: 5, default: 5 },
    responseHours: { type: Number, min: 0, default: 4 }, // temps de réponse moyen (heures)
    onTimeRate: { type: Number, min: 0, max: 100, default: 95 }, // livraisons dans les délais (%)
    repurchaseRate: { type: Number, min: 0, max: 100, default: 20 }, // taux de réachat (%)
    markets: { type: [String], default: [] },
    // Boutique ouverte par un vendeur (owner = son compte). Les vendeurs créés par l'administrateur n'ont pas de propriétaire.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', default: null, index: true }, // marché où se trouve la boutique
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'approved' }, // pending : en attente de validation
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    logo: { type: String, default: '' },
    phone: { type: String, trim: true, default: '' },
    commissionRate: { type: Number, min: 0, max: 100, default: null }, // % retenu par la plateforme ; null = taux des réglages
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);
