const mongoose = require('mongoose');

const STATUSES = ['Ouvert', 'Répondu', 'Clos'];

// Demande de devis (RFQ) ou question au vendeur, avec fil de messages
const inquirySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['devis', 'question', 'echantillon'], default: 'devis' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null, index: true }, // boutique qui répond (vide : l'administrateur)
    productName: { type: String, trim: true, default: '' },
    subject: { type: String, trim: true, required: [true, 'Le sujet est obligatoire'], maxlength: 140 },
    quantity: { type: Number, min: 0, default: 0 },
    budget: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: STATUSES, default: 'Ouvert' },
    messages: [
      {
        from: { type: String, enum: ['client', 'admin'], required: true },
        text: { type: String, required: true, trim: true, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    unreadByAdmin: { type: Boolean, default: true },
    unreadByClient: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Inquiry = mongoose.model('Inquiry', inquirySchema);
Inquiry.STATUSES = STATUSES;
module.exports = Inquiry;
