const mongoose = require('mongoose');

const RETURN_REASONS = ['Produit défectueux', 'Produit non conforme à la description', 'Mauvaise taille ou mauvais modèle', 'Produit endommagé à la livraison', 'Autre'];
const RETURN_STATUSES = ['Demandée', 'Acceptée', 'Refusée', 'Remboursée'];
const STATUSES = ['En attente', 'Confirmée', 'Expédiée', 'Livrée', 'Annulée'];
const PAYMENTS = ['Paiement à la livraison (espèces)', 'Wave à la livraison', 'Orange Money à la livraison'];

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, unique: true, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Une commande par boutique : un panier avec plusieurs vendeurs donne plusieurs commandes (même checkoutId)
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null, index: true },
    checkoutId: { type: String, default: '', index: true },
    commissionRate: { type: Number, default: 0 },
    commission: { type: Number, default: 0 }, // retenue de la plateforme (FCFA), due une fois la commande livrée
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        image: { type: String, default: '' },
        variant: { type: String, default: '' }, // ex. « Couleur : Noir / Taille : M »
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    shippingFee: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: PAYMENTS, default: PAYMENTS[0] },
    adminNote: { type: String, trim: true, default: '', maxlength: 1000 },
    history: [{ _id: false, status: String, at: { type: Date, default: Date.now } }],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
    },
    // Demande de retour / remboursement (après livraison, dans le délai défini dans les réglages)
    returnRequest: {
      reason: { type: String, enum: RETURN_REASONS },
      details: { type: String, trim: true, maxlength: 1000, default: '' },
      status: { type: String, enum: RETURN_STATUSES },
      adminReply: { type: String, trim: true, maxlength: 1000, default: '' },
      requestedAt: { type: Date },
      updatedAt: { type: Date },
    },
    status: { type: String, enum: STATUSES, default: 'En attente' },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
Order.STATUSES = STATUSES;
Order.PAYMENTS = PAYMENTS;
Order.RETURN_REASONS = RETURN_REASONS;
Order.RETURN_STATUSES = RETURN_STATUSES;
module.exports = Order;
