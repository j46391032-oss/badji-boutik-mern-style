const router = require('express').Router();
const rateLimit = require('../middleware/rateLimit');
const orderLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, key: (req) => String(req.user?._id || req.ip) });
const c = require('../controllers/orderController');
const { protect, permit } = require('../middleware/auth');

router.get('/', protect, permit('commandes'), c.getOrders);
router.post('/', protect, orderLimit, c.createOrder);
router.get('/export', protect, permit('commandes'), c.exportOrders); // avant /:id
router.get('/mine', protect, c.getMyOrders); // avant /:id
router.get('/:id', protect, c.getOrder);
router.get('/:id/picklist', protect, c.getPicklist);
router.post('/:id/return', protect, orderLimit, c.requestReturn);
router.put('/:id/return', protect, c.updateReturn); // administrateur ou vendeur de la commande (vérifié dans le contrôleur)
router.put('/:id', protect, c.updateOrder);

module.exports = router;
