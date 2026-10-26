const router = require('express').Router();
const c = require('../controllers/storeController');

router.get('/', c.getStore);
router.get('/rayon/:slug', c.getRayon);
router.get('/zone/:zone', c.getZone);

module.exports = router;
