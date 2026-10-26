const router = require('express').Router();
const c = require('../controllers/sellerController');
const products = require('../controllers/productController');
const orders = require('../controllers/orderController');
const inquiries = require('../controllers/inquiryController');
const { protect, sellerOnly, shopApproved } = require('../middleware/auth');
const upload = require('../middleware/upload');
const rateLimit = require('../middleware/rateLimit');
const shopLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: (req) => String(req.user?._id || req.ip) });
const uploadLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, key: (req) => String(req.user?._id || req.ip) });

router.use(protect);
router.post('/shop', shopLimit, c.createShop); // tout client connecté peut ouvrir sa boutique

// le reste est réservé aux propriétaires de boutique
router.use(sellerOnly);
router.route('/shop').get(c.getShop).put(c.updateShop);
router.get('/stats', c.getStats);
router.get('/earnings', c.getEarnings);
router.post('/upload', uploadLimit, upload.single('image'), products.uploadImage);

router.get('/products', c.scopeProducts, products.getProducts);
router.post('/products', shopApproved, c.createProduct);
router.route('/products/:id').get(c.getProduct).put(c.updateProduct).delete(c.deleteProduct);

router.get('/orders/export', orders.exportOrders); // avant /orders/:id côté commandes
router.get('/orders', orders.getOrders); // limitées à la boutique (req.shop)
router.get('/inquiries', inquiries.getInquiries);

module.exports = router;
