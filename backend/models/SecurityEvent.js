const mongoose = require('mongoose');

// Évènements de sécurité (connexions réussies du personnel, échecs, verrouillages, changements de mot de passe, double authentification…)
// Visibles par l'administrateur du projet ; supprimés automatiquement après 90 jours.
const eventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    detail: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('SecurityEvent', eventSchema);
