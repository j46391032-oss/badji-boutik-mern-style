const router = require('express').Router();
const { getStats, getSummary } = require('../controllers/statsController');
const { protect, adminOnly, permit } = require('../middleware/auth');

router.get('/', protect, permit('stats'), getStats);
router.get('/summary', protect, adminOnly, getSummary);

module.exports = router;
