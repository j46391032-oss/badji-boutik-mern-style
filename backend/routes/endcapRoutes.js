const router = require('express').Router();
const c = require('../controllers/endcapController');
const { protect, permit } = require('../middleware/auth');

router.get('/', c.getEndcaps);
router.get('/all', protect, permit('produits'), c.getAll); // avant /:id
router.post('/', protect, permit('produits'), c.create);
router.put('/:id', protect, permit('produits'), c.update);
router.delete('/:id', protect, permit('produits'), c.remove);

module.exports = router;
