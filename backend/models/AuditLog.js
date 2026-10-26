const mongoose = require('mongoose');

// Journal d'activité : chaque action de modification faite par un membre du personnel (visible par l'administrateur du projet)
const auditSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, default: '' },
    role: { type: String, default: '' },
    module: { type: String, default: '' },
    action: { type: String, required: true }, // ex. « Modification — Produits »
    detail: { type: String, default: '' },
    method: { type: String, default: '' },
    path: { type: String, default: '' },
    status: { type: Number, default: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditSchema);
