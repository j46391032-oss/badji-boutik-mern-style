const router = require('express').Router();
const c = require('../controllers/marketController');
const { protect, permit } = require('../middleware/auth');

router.get('/', c.getMarkets);
router.get('/:slug', c.getMarket);
router.post('/', protect, permit('boutiques'), c.createMarket);
router.put('/:id', protect, permit('boutiques'), c.updateMarket);
router.delete('/:id', protect, permit('boutiques'), c.deleteMarket);

module.exports = router;
