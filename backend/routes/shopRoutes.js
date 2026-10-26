const router = require('express').Router();
const c = require('../controllers/shopController');
const { protect, permit } = require('../middleware/auth');

router.use(protect, permit('boutiques'));
router.get('/', c.getShops);
router.put('/:id/status', c.setStatus);
router.put('/:id', c.updateShop);
router.get('/:id/ledger', c.getLedger);
router.post('/:id/settlements', c.addSettlement);
router.delete('/:id/settlements/:settlementId', c.deleteSettlement);

module.exports = router;
