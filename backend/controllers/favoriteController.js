const User = require('../models/User');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/favorites — produits favoris du client connecté
exports.getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'favorites', populate: { path: 'category', select: 'name icon' } });
  res.json(user.favorites);
});

// PUT /api/favorites/:productId
exports.addFavorite = asyncHandler(async (req, res) => {
  if (!(await Product.exists({ _id: req.params.productId }))) {
    res.status(404);
    throw new Error('Produit introuvable');
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { favorites: req.params.productId } }, { new: true });
  res.json({ favorites: user.favorites });
});

// DELETE /api/favorites/:productId
exports.removeFavorite = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: req.params.productId } }, { new: true });
  res.json({ favorites: user.favorites });
});
