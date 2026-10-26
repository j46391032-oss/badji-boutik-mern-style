const mongoose = require('mongoose');
const Order = require('../models/Order');
const Settlement = require('../models/Settlement');

const toId = (id) => new mongoose.Types.ObjectId(String(id));

// Taux de commission d'une boutique : le sien s'il est défini, sinon celui des réglages. Les boutiques de l'administrateur (sans propriétaire) : 0.
const commissionRateFor = (shop, settings) => {
  if (!shop || !shop.owner) return 0;
  return shop.commissionRate ?? settings.commissionRate ?? 0;
};

// Situation financière d'une boutique.
// Ventes livrées (hors commandes remboursées) → commission due ; moins les reversements déjà enregistrés.
async function shopLedger(shopId) {
  const id = toId(shopId);
  const [delivered, pending, paid] = await Promise.all([
    Order.aggregate([
      { $match: { seller: id, status: 'Livrée', 'returnRequest.status': { $ne: 'Remboursée' } } },
      { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: { $subtract: ['$subtotal', '$discount'] } }, shipping: { $sum: '$shippingFee' }, commission: { $sum: '$commission' } } },
    ]),
    Order.aggregate([
      { $match: { seller: id, status: { $in: ['En attente', 'Confirmée', 'Expédiée'] } } },
      { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: { $subtract: ['$subtotal', '$discount'] } }, commission: { $sum: '$commission' } } },
    ]),
    Settlement.aggregate([{ $match: { shop: id } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  const d = delivered[0] || { orders: 0, sales: 0, shipping: 0, commission: 0 };
  const p = pending[0] || { orders: 0, sales: 0, commission: 0 };
  const settled = paid[0]?.total || 0;
  return {
    deliveredOrders: d.orders,
    sales: d.sales, // ventes livrées (produits, après remise)
    commission: d.commission, // commission de la plateforme sur ces ventes
    net: d.sales - d.commission, // ce que le vendeur garde
    shipping: d.shipping,
    settled, // déjà reversé à la plateforme
    due: Math.max(d.commission - settled, 0), // reste à reverser
    credit: Math.max(settled - d.commission, 0), // trop-perçu éventuel
    pendingOrders: p.orders,
    pendingSales: p.sales,
    pendingCommission: p.commission,
  };
}

module.exports = { commissionRateFor, shopLedger };
