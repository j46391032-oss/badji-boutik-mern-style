const mongoose = require('mongoose');

// Reversement d'un vendeur à la plateforme (commissions). Les clients paient à la livraison : c'est le vendeur
// qui encaisse, puis reverse sa commission à la plateforme ; l'administrateur enregistre chaque reversement.
const settlementSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    amount: { type: Number, required: [true, 'Le montant est obligatoire'], min: [1, 'Le montant doit être positif'] },
    method: { type: String, enum: ['Espèces', 'Wave', 'Orange Money', 'Virement', 'Autre'], default: 'Espèces' },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settlement', settlementSchema);
