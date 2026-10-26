const router = require('express').Router();
const c = require('../controllers/categoryController');
const { protect, permit } = require('../middleware/auth');

router.get('/', c.getCategories);
router.post('/', protect, permit('produits'), c.createCategory);
router.put('/:id', protect, permit('produits'), c.updateCategory);
router.delete('/:id', protect, permit('produits'), c.deleteCategory);

module.exports = router;
