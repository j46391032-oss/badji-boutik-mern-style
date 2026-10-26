const mongoose = require('mongoose');

// Un grand marché (comme dans la vraie vie) : il regroupe des boutiques d'un même univers (tissus, high-tech, produits frais…)
const marketSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Le nom du marché est obligatoire'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: '' },
    icon: { type: String, default: '🏬' },
    color: { type: String, default: '#08855c' },
    // catégories qu'on peut vendre dans ce marché (vide : toutes)
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    // catégories que l'administrateur a retirées exprès : on ne les remet pas automatiquement
    excluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Market', marketSchema);
