const User = require('../models/User');
const Order = require('../models/Order');
const { isStaff, can } = require('../utils/permissions');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users (admin) — clients avec nombre de commandes et total dépensé
exports.getUsers = asyncHandler(async (req, res) => {
  const filter = { role: 'client' };
  const term = String(req.query.q || '').trim();
  if (term) {
    const rx = { $regex: escapeRegex(term), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (req.query.blocked === '1') filter.blocked = true;

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
  const total = await User.countDocuments(filter);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
  const users = await User.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean();

  const agg = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: 'Annulée' } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$totalAmount' }, last: { $max: '$createdAt' } } },
  ]);
  const map = new Map(agg.map((a) => [String(a._id), a]));
  const items = users.map((u) => ({ ...u, favorites: undefined, orders: map.get(String(u._id))?.orders || 0, spent: map.get(String(u._id))?.spent || 0, lastOrder: map.get(String(u._id))?.last || null }));
  res.json({ items, total, page, pages });
});

// GET /api/users/:id (admin) — fiche client avec ses commandes
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) {
    res.status(404);
    throw new Error('Client introuvable');
  }
  const orders = await Order.find({ user: user._id }).sort('-createdAt').limit(20);
  res.json({ ...user, favorites: undefined, orders });
});

// PUT /api/users/:id (admin) — suspendre / réactiver un compte client
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('Client introuvable');
  }
  if (isStaff(user)) {
    res.status(400);
    throw new Error("Le compte d'un administrateur ne peut pas être suspendu");
  }
  if (req.body.blocked !== undefined) user.blocked = Boolean(req.body.blocked);
  await user.save();
  res.json({ _id: user._id, blocked: user.blocked });
});
