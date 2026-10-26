const mongoose = require('mongoose');
const Order = require('../models/Order');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Counter = require('../models/Counter');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { evaluateCoupon } = require('../utils/coupon');
const { computeShipping } = require('../utils/pricing');
const { buildVariant } = require('../utils/variants');
const { isStaff, can } = require('../utils/permissions');
const { commissionRateFor } = require('../utils/shop');
const asyncHandler = require('../utils/asyncHandler');

const nextOrderNumber = async () => {
  const c = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return 1000 + c.seq; // #1001, #1002, ...
};

const giveBackStock = async (items) => {
  for (const it of items) await Product.updateOne({ _id: it.product }, { $inc: { stock: it.quantity, sold: -it.quantity } });
};

// L'administrateur gère toutes les commandes ; un vendeur seulement celles de sa boutique
const manages = (user, order) => can(user, 'commandes') || Boolean(user.shop && order.seller && String(order.seller) === String(user.shop));
exports.manages = manages;

const releaseCoupon = (filter) => Coupon.updateOne({ ...filter, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });

// POST /api/orders — le prix (y compris les prix dégressifs), la livraison et le total sont recalculés côté serveur
exports.createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Le panier est vide');
  }
  const a = shippingAddress || {};
  if (!a.fullName || !a.phone || !a.address || !a.city) {
    res.status(400);
    throw new Error('Adresse de livraison incomplète');
  }

  // lignes du panier (un même produit peut apparaître avec plusieurs variantes) ; les quantités sont cumulées par produit
  const lines = [];
  const wanted = new Map();
  for (const i of items) {
    const q = parseInt(i.quantity, 10);
    if (!i.product || !(q > 0)) {
      res.status(400);
      throw new Error('Article invalide dans le panier');
    }
    lines.push({ id: String(i.product), qty: q, selection: i.variant });
    wanted.set(String(i.product), (wanted.get(String(i.product)) || 0) + q);
  }

  const settings = await Settings.get();
  const reserved = [];
  let claimed = null;
  const createdOrders = [];
  try {
    const orderItems = [];
    const shipItems = [];
    const itemSellers = []; // boutique de chaque ligne (vide : produit de la plateforme)
    for (const [id, qty] of wanted) {
      const current = await Product.findById(id);
      if (!current || current.published === false) {
        res.status(400);
        throw new Error('Un produit du panier est introuvable');
      }
      if (qty < (current.moq || 1)) {
        res.status(400);
        throw new Error(`Quantité minimum de ${current.moq} pour « ${current.name} »`);
      }
      // options (couleur, taille…) : obligatoires si le produit en propose
      const productLines = [];
      for (const l of lines.filter((x) => x.id === id)) {
        try {
          productLines.push({ ...l, variant: buildVariant(current, l.selection) });
        } catch (e) {
          res.status(400);
          throw e;
        }
      }
      // décrémente le stock seulement s'il est suffisant (opération atomique)
      const p = await Product.findOneAndUpdate({ _id: id, stock: { $gte: qty } }, { $inc: { stock: -qty, sold: qty } }, { new: true });
      if (!p) {
        res.status(400);
        throw new Error(`Stock insuffisant pour « ${current.name} » (${current.stock} disponible)`);
      }
      reserved.push({ product: p._id, quantity: qty });
      const unit = p.unitPrice(qty); // prix dégressif selon la quantité totale du produit
      for (const l of productLines) {
        orderItems.push({ product: p._id, name: p.name, price: unit, image: p.image, variant: l.variant, quantity: l.qty });
        itemSellers.push(p.supplier ? String(p.supplier) : '');
      }
      shipItems.push({ freeShipping: p.freeShipping, seller: p.supplier ? String(p.supplier) : '' });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Code promo : vérifié et recalculé côté serveur, utilisation réservée de façon atomique
    let discount = 0;
    let couponCode = '';
    if (req.body.couponCode) {
      const coupon = await Coupon.findOne({ code: String(req.body.couponCode).trim().toUpperCase() });
      const r = evaluateCoupon(coupon, subtotal);
      if (!r.ok) {
        res.status(400);
        throw new Error(r.message);
      }
      claimed = await Coupon.findOneAndUpdate(
        { _id: coupon._id, active: true, $or: [{ maxUses: 0 }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        { $inc: { usedCount: 1 } },
        { new: true }
      );
      if (!claimed) {
        res.status(400);
        throw new Error("Ce code promo n'est plus disponible");
      }
      discount = r.discount;
      couponCode = coupon.code;
    }

    const paymentMethod = Order.PAYMENTS.includes(req.body.paymentMethod) ? req.body.paymentMethod : Order.PAYMENTS[0];

    // Une commande par boutique : chaque vendeur ne voit et ne traite que ses articles.
    // La remise du code promo est répartie au prorata du sous-total de chaque commande.
    // Seules les boutiques de vendeurs (avec propriétaire) séparent les commandes ; les produits de la plateforme et
    // des vendeurs créés par l'administrateur restent ensemble.
    const shops = await Supplier.find({ _id: { $in: [...new Set(itemSellers.filter(Boolean))] }, owner: { $ne: null } });
    const shopById = new Map(shops.map((x) => [String(x._id), x]));
    const groupOf = (sid) => (shopById.has(sid) ? sid : '');
    const groupedSellers = itemSellers.map(groupOf);
    const sellerIds = [...new Set(groupedSellers)];
    const checkoutId = new mongoose.Types.ObjectId().toString();
    let discountLeft = discount;
    for (const [gi, sid] of sellerIds.entries()) {
      const items = orderItems.filter((_, i) => groupedSellers[i] === sid);
      const sub = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const disc = gi === sellerIds.length - 1 ? discountLeft : Math.min(Math.floor((discount * sub) / subtotal), discountLeft);
      discountLeft -= disc;
      const shippingFee = computeShipping(settings, shipItems.filter((x) => groupOf(x.seller) === sid), sub);
      const rate = commissionRateFor(shopById.get(sid), settings);
      const created = await Order.create({
        orderNumber: await nextOrderNumber(),
        user: req.user._id,
        seller: sid || null,
        checkoutId,
        commissionRate: rate,
        commission: Math.round(((sub - disc) * rate) / 100),
        items,
        subtotal: sub,
        discount: disc,
        couponCode,
        shippingFee,
        paymentMethod,
        totalAmount: sub - disc + shippingFee,
        shippingAddress: { fullName: a.fullName, phone: a.phone, address: a.address, city: a.city },
        history: [{ status: 'En attente' }],
      });
      createdOrders.push(created);
    }
    const first = createdOrders[0];
    res.status(201).json({ ...first.toJSON(), orders: createdOrders.map((o) => ({ _id: o._id, orderNumber: o.orderNumber, totalAmount: o.totalAmount })) });
  } catch (err) {
    await giveBackStock(reserved);
    if (createdOrders.length) await Order.deleteMany({ _id: { $in: createdOrders.map((o) => o._id) } });
    if (claimed) await releaseCoupon({ _id: claimed._id });
    throw err;
  }
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Construit le filtre des commandes (admin) : statut, recherche (n°, client), période
async function orderFilter(q) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(new Date(q.to).getTime() + 86400000 - 1);
  }
  if (q.returns === '1') filter['returnRequest.status'] = { $exists: true };
  const term = String(q.q || '').trim().replace(/^#/, '');
  if (term) {
    const or = [];
    if (/^\d+$/.test(term)) or.push({ orderNumber: Number(term) });
    const rx = { $regex: escapeRegex(term), $options: 'i' };
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').limit(100);
    if (users.length) or.push({ user: { $in: users.map((u) => u._id) } });
    or.push({ 'shippingAddress.fullName': rx }, { 'shippingAddress.phone': rx });
    filter.$or = or;
  }
  return filter;
}

// GET /api/orders (admin) — toutes les commandes (tableau) ou paginées avec ?page=
exports.getOrders = asyncHandler(async (req, res) => {
  const filter = await orderFilter(req.query);
  if (req.shop) filter.seller = req.shop._id; // espace vendeur : seulement les commandes de la boutique
  const query = Order.find(filter).sort('-createdAt').populate('user', 'name email phone');
  if (!req.query.page) return res.json(await query);

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
  const { status, ...withoutStatus } = req.query; // les compteurs par statut ignorent le filtre de statut
  const [total, byStatus] = await Promise.all([
    Order.countDocuments(filter),
    Order.aggregate([{ $match: { ...(await orderFilter(withoutStatus)), ...(req.shop ? { seller: req.shop._id } : {}) } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
  const items = await query.skip((page - 1) * limit).limit(limit);
  res.json({ items, total, page, pages, counts: Object.fromEntries(byStatus.map((s) => [s._id, s.count])) });
});

// GET /api/orders/export (admin) — fichier CSV (ouvrable dans Excel)
exports.exportOrders = asyncHandler(async (req, res) => {
  const exportFilter = await orderFilter(req.query);
  if (req.shop) exportFilter.seller = req.shop._id;
  const orders = await Order.find(exportFilter).sort('-createdAt').populate('user', 'name email');
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['N°', 'Date', 'Client', 'Email', 'Téléphone', 'Ville', 'Articles', 'Sous-total', 'Remise', 'Livraison', 'Total', 'Statut', 'Paiement'];
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.createdAt.toISOString().slice(0, 10),
      o.shippingAddress.fullName,
      o.user?.email || '',
      o.shippingAddress.phone,
      o.shippingAddress.city,
      o.items.map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ''} x${i.quantity}`).join(' | '),
      o.subtotal,
      o.discount,
      o.shippingFee || 0,
      o.totalAmount,
      o.status,
      o.paymentMethod || '',
    ]
      .map(cell)
      .join(';')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="commandes.csv"');
  res.send('\ufeff' + [head.map(cell).join(';'), ...rows].join('\r\n'));
});

// GET /api/orders/mine — commandes du client connecté
exports.getMyOrders = asyncHandler(async (req, res) => {
  res.json(await Order.find({ user: req.user._id }).sort('-createdAt'));
});

// GET /api/orders/:id
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) {
    res.status(404);
    throw new Error('Commande introuvable');
  }
  if (!manages(req.user, order) && String(order.user._id) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Vous n'avez pas accès à cette commande");
  }
  res.json(order);
});

// PUT /api/orders/:id — admin : change le statut et/ou la note interne ; client : annule une commande « En attente »
exports.updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Commande introuvable');
  }
  const { status, adminNote } = req.body;

  const staff = manages(req.user, order);
  if (staff && adminNote !== undefined) {
    order.adminNote = String(adminNote).slice(0, 1000);
    if (status === undefined) {
      await order.save();
      return res.json(order);
    }
  }
  if (!Order.STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Statut invalide. Valeurs possibles : ${Order.STATUSES.join(', ')}`);
  }

  if (!staff) {
    if (String(order.user) !== String(req.user._id)) {
      res.status(403);
      throw new Error("Vous n'avez pas accès à cette commande");
    }
    if (status !== 'Annulée' || order.status !== 'En attente') {
      res.status(403);
      throw new Error('Vous pouvez uniquement annuler une commande en attente');
    }
  }
  if (order.status === 'Annulée') {
    res.status(400);
    throw new Error('Une commande annulée ne peut plus être modifiée');
  }
  if (order.status === 'Livrée' && status === 'Annulée') {
    res.status(400);
    throw new Error('Une commande livrée ne peut pas être annulée');
  }

  if (status === 'Annulée') {
    await giveBackStock(order.items); // le stock est remis en vente
    if (order.couponCode) {
      // un panier multi-boutiques partage le même code : on ne le rend que si toutes les commandes du panier sont annulées
      const others = order.checkoutId ? await Order.countDocuments({ checkoutId: order.checkoutId, _id: { $ne: order._id }, status: { $ne: 'Annulée' } }) : 0;
      if (!others) await releaseCoupon({ code: order.couponCode }); // l'utilisation du code est rendue
    }
  }
  if (order.status !== status) {
    order.status = status;
    order.history.push({ status });
  }
  await order.save();
  res.json(order);
});

// POST /api/orders/:id/return — le client demande un retour / remboursement (commande livrée, dans le délai des réglages)
exports.requestReturn = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || String(order.user) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Commande introuvable');
  }
  if (order.status !== 'Livrée') {
    res.status(400);
    throw new Error('Un retour ne peut être demandé que pour une commande livrée');
  }
  if (order.returnRequest?.status) {
    res.status(400);
    throw new Error('Une demande de retour existe déjà pour cette commande');
  }
  const { reason, details } = req.body;
  if (!Order.RETURN_REASONS.includes(reason)) {
    res.status(400);
    throw new Error('Veuillez choisir un motif de retour');
  }
  const settings = await Settings.get();
  const delivered = [...order.history].reverse().find((h) => h.status === 'Livrée')?.at || order.updatedAt;
  const deadline = new Date(delivered).getTime() + (settings.returnDays || 0) * 86400000;
  if (Date.now() > deadline) {
    res.status(400);
    throw new Error(`Le délai de retour de ${settings.returnDays} jour(s) est dépassé`);
  }
  order.returnRequest = { reason, details: String(details || '').slice(0, 1000), status: 'Demandée', requestedAt: new Date(), updatedAt: new Date() };
  await order.save();
  res.status(201).json(order);
});

// PUT /api/orders/:id/return (admin) — accepter, refuser ou marquer comme remboursé
exports.updateReturn = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order && !manages(req.user, order)) {
    res.status(403);
    throw new Error("Vous n'avez pas accès à cette commande");
  }
  if (!order || !order.returnRequest?.status) {
    res.status(404);
    throw new Error('Aucune demande de retour pour cette commande');
  }
  const { status, adminReply } = req.body;
  if (!Order.RETURN_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Statut invalide. Valeurs possibles : ${Order.RETURN_STATUSES.join(', ')}`);
  }
  order.returnRequest.status = status;
  if (adminReply !== undefined) order.returnRequest.adminReply = String(adminReply).slice(0, 1000);
  order.returnRequest.updatedAt = new Date();
  await order.save();
  res.json(order);
});

// GET /api/orders/:id/picklist — bon de préparation : les articles dans l'ordre du magasin (zone → allée → place du planogramme),
// pour préparer la commande d'une traite, comme un chariot de préparateur dans un supermarché
exports.getPicklist = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name phone');
  if (!order || !manages(req.user, order)) {
    res.status(order ? 403 : 404);
    throw new Error(order ? "Vous n'avez pas accès à cette commande" : 'Commande introuvable');
  }
  const products = await Product.find({ _id: { $in: order.items.map((i) => i.product) } }).populate('category', 'name icon zone aisle');
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const ZONES = ['fresh', 'grocery', 'general'];
  const LETTER = { fresh: 'F', grocery: 'E', general: 'G' };
  const lines = order.items
    .map((i) => {
      const p = byId.get(String(i.product));
      const zone = p?.category?.zone || '';
      const planned = p && p.position < 1000000 ? p.position : null;
      return {
        name: i.name, variant: i.variant, quantity: i.quantity, zone, rayon: p?.category?.name || '—', icon: p?.category?.icon || '',
        aisle: p?.category?.aisle || 0, bay: p?.bay || '', position: planned,
        code: zone ? `${LETTER[zone]}${p.category.aisle}-${planned ?? '–'}` : '—',
      };
    })
    .sort((a, b) => (ZONES.indexOf(a.zone) + 1 || 9) - (ZONES.indexOf(b.zone) + 1 || 9) || a.aisle - b.aisle || (a.position ?? 1e9) - (b.position ?? 1e9) || a.name.localeCompare(b.name));
  res.json({ order: { _id: order._id, orderNumber: order.orderNumber, createdAt: order.createdAt, shippingAddress: order.shippingAddress, customer: order.user?.name || '', status: order.status }, lines });
});
