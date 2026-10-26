const router = require('express').Router();
const c = require('../controllers/planogramController');
const { protect, permit } = require('../middleware/auth');

router.use(protect, permit('produits'));
router.get('/:categoryId', c.getPlanogram);
router.put('/:categoryId', c.savePlanogram);
router.post('/:categoryId/auto', c.autoPlan);

module.exports = router;
