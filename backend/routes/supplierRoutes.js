const router = require('express').Router();
const c = require('../controllers/supplierController');
const { protect, permit } = require('../middleware/auth');

// publiques (annuaire et boutique d'un vendeur)
router.get('/directory', c.directory);
router.get('/:id/profile', c.profile);

router.use(protect, permit('produits'));
router.get('/', c.getSuppliers);
router.post('/', c.createSupplier);
router.put('/:id', c.updateSupplier);
router.delete('/:id', c.deleteSupplier);

module.exports = router;
