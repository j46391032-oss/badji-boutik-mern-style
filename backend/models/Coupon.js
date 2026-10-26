const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: [true, 'Le code est obligatoire'], unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: {
      type: Number,
      required: [true, 'La valeur est obligatoire'],
      min: [1, 'La valeur doit être positive'],
      validate: {
        validator() {
          return this.type !== 'percent' || this.value <= 100;
        },
        message: 'Un pourcentage ne peut pas dépasser 100',
      },
    },
    minOrder: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: 0, min: 0 }, // 0 = illimité
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
