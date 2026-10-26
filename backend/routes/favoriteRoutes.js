const router = require('express').Router();
const c = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

router.get('/', protect, c.getFavorites);
router.put('/:productId', protect, c.addFavorite);
router.delete('/:productId', protect, c.removeFavorite);

module.exports = router;
