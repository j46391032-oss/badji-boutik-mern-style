const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: [true, 'La note est obligatoire'], min: [1, 'Note minimale : 1'], max: [5, 'Note maximale : 5'] },
    comment: { type: String, trim: true, maxlength: [1000, 'Commentaire trop long (1000 caractères maximum)'], default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // un avis par client et par produit

module.exports = mongoose.model('Review', reviewSchema);
