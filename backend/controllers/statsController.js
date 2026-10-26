const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');

const DAY = 86400000;
const notCancelled = { status: { $ne: 'Annulée' } };
const utcMidnight = (d, offsetDays = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDays));

// Chiffre d'affaires et nombre de commandes sur une période
const period = async (from, to) => {
  const [r] = await Order.aggregate([
    { $match: { ...notCancelled, createdAt: { $gte: from, ...(to ? { $lt: to } : {}) } } },
    { $group: { _id: null, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
  ]);
  const revenue = r?.revenue || 0;
  const orders = r?.orders || 0;
  return { revenue, orders, avgBasket: orders ? Math.round(revenue / orders) : 0 };
};

// GET /api/stats?days=7|30|90 (admin)
exports.getStats = asyncHandler(async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = utcMidnight(new Date(), -(days - 1));
  const prevSince = new Date(since.getTime() - days * DAY);
  const settings = await Settings.get();

  const [products, clients, orders, sales, recentOrders, byDay, topProducts, byStatus, current, previous, newClients, prevNewClients, lowStock, lowStockCount, outOfStock, openInquiries, byCategory] =
    await Promise.all([
      Product.countDocuments(),
      User.countDocuments({ role: 'client' }),
      Order.countDocuments(),
      Order.aggregate([{ $match: notCancelled }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Order.find().sort('-createdAt').limit(6).populate('user', 'name'),
      Order.aggregate([
        { $match: { ...notCancelled, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...notCancelled, createdAt: { $gte: since } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            image: { $first: '$items.image' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      period(since),
      period(prevSince, since),
      User.countDocuments({ role: 'client', createdAt: { $gte: since } }),
      User.countDocuments({ role: 'client', createdAt: { $gte: prevSince, $lt: since } }),
      Product.find({ stock: { $lte: settings.lowStockThreshold } }).sort('stock').limit(8).select('name stock image'),
      Product.countDocuments({ stock: { $lte: settings.lowStockThreshold } }),
      Product.countDocuments({ stock: 0 }),
      Inquiry.countDocuments({ status: 'Ouvert' }),
      Order.aggregate([
        { $match: { ...notCancelled, createdAt: { $gte: since } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $group: { _id: '$p.category', revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'c' } },
        { $unwind: '$c' },
        { $project: { _id: 0, name: '$c.name', revenue: 1 } },
        { $sort: { revenue: -1 } },
      ]),
    ]);

  // une valeur par jour, y compris les jours sans vente
  const map = new Map(byDay.map((d) => [d._id, d]));
  const salesByDay = Array.from({ length: days }, (_, i) => {
    const date = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
    return { date, total: map.get(date)?.total || 0, orders: map.get(date)?.orders || 0 };
  });

  res.json({
    days,
    products,
    clients,
    orders,
    sales: sales[0]?.total || 0,
    recentOrders,
    salesByDay,
    topProducts,
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
    period: { ...current, newClients, prev: { ...previous, newClients: prevNewClients } },
    lowStock,
    lowStockCount,
    outOfStock,
    openInquiries,
    salesByCategory: byCategory,
  });
});

// GET /api/stats/summary (admin) — pastilles de la barre latérale
exports.getSummary = asyncHandler(async (req, res) => {
  const settings = await Settings.get();
  const pendingShops = await require('../models/Supplier').countDocuments({ status: 'pending', owner: { $ne: null } });
  const [pendingOrders, openInquiries, lowStock] = await Promise.all([
    Order.countDocuments({ status: 'En attente' }),
    Inquiry.countDocuments({ unreadByAdmin: true, status: { $ne: 'Clos' } }),
    Product.countDocuments({ stock: { $lte: settings.lowStockThreshold } }),
  ]);
  res.json({ pendingOrders, openInquiries, lowStock, pendingShops });
});
