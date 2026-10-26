const router = require('express').Router();
const c = require('../controllers/settingsController');
const { protect, permit } = require('../middleware/auth');

router.get('/', c.getSettings);
router.put('/', protect, permit('parametres'), c.updateSettings);

module.exports = router;
