const router = require('express').Router();
const rateLimit = require('../middleware/rateLimit');
const uploadLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, key: (req) => String(req.user?._id || req.ip) });
const reviewLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, key: (req) => String(req.user?._id || req.ip) });
const c = require('../controllers/productController');
const { protect, permit, optionalAuth } = require('../middleware/auth');
const r = require('../controllers/reviewController');
const upload = require('../middleware/upload');

router.get('/', optionalAuth, c.getProducts);
router.get('/suggest', c.suggest); // avant /:id
router.post('/upload', protect, permit('produits'), uploadLimit, upload.single('image'), c.uploadImage); // avant /:id
router.get('/:id', optionalAuth, c.getProduct);
router.get('/:id/related', c.getRelated);
router.get('/:id/reviews', r.getProductReviews);
router.post('/:id/reviews', protect, reviewLimit, r.saveReview);
router.post('/:id/duplicate', protect, permit('produits'), c.duplicateProduct);
router.post('/', protect, permit('produits'), c.createProduct);
router.put('/:id', protect, permit('produits'), c.updateProduct);
router.delete('/:id', protect, permit('produits'), c.deleteProduct);

module.exports = router;
