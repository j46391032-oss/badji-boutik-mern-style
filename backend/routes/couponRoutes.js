const router = require('express').Router();
const rateLimit = require('../middleware/rateLimit');

const c = require('../controllers/couponController');
const { protect, permit } = require('../middleware/auth');

const validateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: 'Trop d’essais de codes promo, réessayez dans quelques minutes.' });
router.post('/validate', protect, validateLimit, c.validateCoupon); // avant /:id
router.get('/', protect, permit('promos'), c.getCoupons);
router.post('/', protect, permit('promos'), c.createCoupon);
router.put('/:id', protect, permit('promos'), c.updateCoupon);
router.delete('/:id', protect, permit('promos'), c.deleteCoupon);

module.exports = router;
