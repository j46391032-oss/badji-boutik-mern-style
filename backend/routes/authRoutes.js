const router = require('express').Router();
const c = require('../controllers/authController');
const oauth = require('../controllers/oauthController');
const { protect } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 }); // connexion / inscription par adresse IP
const codeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }); // 2e étape
const accountLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, key: (req) => String(req.user?._id || req.ip) }); // actions sensibles du compte
const oauthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

router.post('/register', authLimiter, c.register);
router.post('/login', authLimiter, c.login);
router.post('/2fa/verify', codeLimiter, c.verifyTwoFactor);

router.get('/providers', oauth.providers);
router.get('/oauth/:provider', oauthLimiter, oauth.start);
router.get('/oauth/:provider/callback', oauthLimiter, oauth.callback);

router.route('/profile').get(protect, c.getProfile).put(protect, accountLimiter, c.updateProfile);
router.get('/security', protect, c.getSecurity);
router.post('/logout-all', protect, accountLimiter, c.logoutAll);
router.post('/2fa/setup', protect, accountLimiter, c.setupTwoFactor);
router.post('/2fa/enable', protect, accountLimiter, c.enableTwoFactor);
router.post('/2fa/disable', protect, accountLimiter, c.disableTwoFactor);

module.exports = router;
