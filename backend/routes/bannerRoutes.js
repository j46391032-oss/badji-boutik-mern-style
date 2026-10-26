const router = require('express').Router();
const c = require('../controllers/bannerController');
const { protect, permit, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, c.getBanners);
router.post('/', protect, permit('produits'), c.createBanner);
router.put('/:id', protect, permit('produits'), c.updateBanner);
router.delete('/:id', protect, permit('produits'), c.deleteBanner);

module.exports = router;
