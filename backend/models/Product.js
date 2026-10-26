const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Le nom du produit est obligatoire'], trim: true },
    description: { type: String, trim: true, default: '' },
    brand: { type: String, trim: true, default: '' },
    price: { type: Number, required: [true, 'Le prix est obligatoire'], min: [0, 'Le prix doit être positif'] },
    oldPrice: { type: Number, min: [0, "L'ancien prix doit être positif"], default: 0 }, // prix barré (0 = aucune promo)
    image: { type: String, default: '' }, // image principale
    images: { type: [String], default: [] }, // images supplémentaires (galerie)
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'La catégorie est obligatoire'] },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    stock: { type: Number, required: [true, 'Le stock est obligatoire'], min: [0, 'Le stock ne peut pas être négatif'], default: 0 },
    sold: { type: Number, min: 0, default: 0 }, // nombre d'unités vendues
    moq: { type: Number, min: [1, 'La quantité minimum doit être au moins 1'], default: 1 }, // quantité minimum de commande
    // Prix dégressifs : à partir de minQty unités, le prix unitaire devient price
    priceTiers: {
      type: [{ _id: false, minQty: { type: Number, required: true, min: 2 }, price: { type: Number, required: true, min: 0 } }],
      default: [],
    },
    specs: { type: [{ _id: false, label: { type: String, trim: true }, value: { type: String, trim: true } }], default: [] },
    // Options au choix (couleur, taille…) : simples libellés, le stock reste global
    options: {
      type: [{ _id: false, name: { type: String, trim: true, required: true }, values: { type: [String], default: [] } }],
      default: [],
    },
    sampleAvailable: { type: Boolean, default: false }, // un échantillon peut être demandé avant une grosse commande
    // « official » : produit de la boutique officielle ; « market » : produit d'une boutique de vendeur, rangé dans un marché
    origin: { type: String, enum: ['official', 'market'], default: 'official', index: true },
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', default: null, index: true },
    // Planogramme : travée (section d'étagère) et position dans le rayon, fixées par l'administrateur.
    // 1000000 = pas encore placé : le produit passe après ceux du planogramme.
    bay: { type: String, trim: true, default: '' },
    position: { type: Number, default: 1000000, index: true },
    hiddenByAdmin: { type: Boolean, default: false }, // masqué automatiquement parce que la boutique est suspendue
    freeShipping: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true }, // false = masqué dans la boutique
    flashSaleEnds: { type: Date, default: null }, // vente flash active jusqu'à cette date
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// -34 % : calculé à partir du prix barré
productSchema.virtual('discountPercent').get(function () {
  return this.oldPrice > this.price && this.price >= 0 ? Math.round(((this.oldPrice - this.price) / this.oldPrice) * 100) : 0;
});

productSchema.index({ name: 'text' });

// L'origine et le marché suivent la boutique du produit (rattachement fait à la création ou au changement de vendeur)
productSchema.pre('save', async function (next) {
  if (!this.isNew && !this.isModified('supplier')) return next();
  const shop = this.supplier ? await mongoose.model('Supplier').findById(this.supplier).select('owner market') : null;
  this.origin = shop?.owner ? 'market' : 'official';
  this.market = shop?.owner ? shop.market || null : null;
  next();
});

// Prix unitaire selon la quantité commandée (prix dégressifs)
productSchema.methods.unitPrice = function (qty) {
  let price = this.price;
  let best = 0;
  for (const t of this.priceTiers || []) if (qty >= t.minQty && t.minQty > best) { best = t.minQty; price = t.price; }
  return price;
};

module.exports = mongoose.model('Product', productSchema);
