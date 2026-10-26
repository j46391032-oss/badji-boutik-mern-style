const Review = require('../models/Review');
const Product = require('../models/Product');

// Recalcule la note moyenne et le nombre d'avis d'un produit
module.exports = async function recomputeRating(productId) {
  const [r] = await Review.aggregate([
    { $match: { product: new (require('mongoose').Types.ObjectId)(String(productId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { ratingAvg: r ? Math.round(r.avg * 10) / 10 : 0, ratingCount: r ? r.count : 0 }
  );
};
