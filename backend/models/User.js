const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ALL_MODULES } = require('../utils/permissions');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Le nom est obligatoire'], trim: true },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },
    password: {
      type: String,
      // un compte créé via Google / Facebook / GitHub n'a pas de mot de passe
      required: [function () { return !(this.providers && this.providers.length); }, 'Le mot de passe est obligatoire'],
      minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
      select: false,
    },
    providers: { type: [{ _id: false, provider: { type: String, enum: ['google', 'facebook', 'github'] }, providerId: { type: String } }], default: [] }, // comptes sociaux liés
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['client', 'admin', 'superadmin'], default: 'client' },
    // modules accessibles à un sous-administrateur (ignoré pour le superadmin, qui a tous les droits)
    permissions: { type: [{ type: String, enum: ALL_MODULES }], default: () => [...ALL_MODULES] },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null }, // boutique du vendeur
    hasPassword: { type: Boolean, default: true }, // faux pour un compte créé via Google / Facebook / GitHub tant qu'il n'a pas choisi de mot de passe
    tokenVersion: { type: Number, default: 0 }, // augmente quand le mot de passe change ou à « déconnexion partout » : les anciens jetons deviennent invalides
    // double authentification (TOTP) : le secret est chiffré, les codes de secours ne sont gardés que sous forme d'empreintes
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
      pendingSecret: { type: String, select: false },
      recovery: { type: [String], select: false, default: [] },
      enabledAt: { type: Date, default: null },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    blocked: { type: Boolean, default: false },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, process.env.NODE_ENV === 'test' ? 4 : 12);
  this.hasPassword = true;
  if (!this.isNew) this.tokenVersion = (this.tokenVersion || 0) + 1; // déconnecte les autres appareils
  next();
});

userSchema.methods.matchPassword = function (plain) {
  if (!this.password) return false; // compte social sans mot de passe
  return bcrypt.compare(plain, this.password);
};

userSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 });

module.exports = mongoose.model('User', userSchema);
