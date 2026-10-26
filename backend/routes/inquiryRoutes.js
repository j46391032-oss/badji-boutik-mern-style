const router = require('express').Router();
const rateLimit = require('../middleware/rateLimit');
const writeLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, key: (req) => String(req.user?._id || req.ip) }); // messages et demandes : pas de spam
const c = require('../controllers/inquiryController');
const { protect, permit } = require('../middleware/auth');

router.post('/', protect, writeLimit, c.createInquiry);
router.get('/mine', protect, c.getMyInquiries); // avant /:id
router.get('/', protect, permit('devis'), c.getInquiries);
router.get('/:id', protect, c.getInquiry);
router.post('/:id/messages', protect, writeLimit, c.addMessage);
router.put('/:id', protect, c.updateInquiry); // administrateur ou vendeur concerné (vérifié dans le contrôleur)

module.exports = router;
