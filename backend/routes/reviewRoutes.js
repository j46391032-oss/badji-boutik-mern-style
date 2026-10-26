const router = require('express').Router();
const { deleteReview, getAllReviews } = require('../controllers/reviewController');
const { protect, permit } = require('../middleware/auth');

router.get('/', protect, permit('avis'), getAllReviews);
router.delete('/:id', protect, deleteReview);

module.exports = router;
