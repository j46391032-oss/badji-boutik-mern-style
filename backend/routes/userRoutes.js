const router = require('express').Router();
const c = require('../controllers/userController');
const { protect, permit } = require('../middleware/auth');

router.get('/', protect, permit('clients'), c.getUsers);
router.get('/:id', protect, permit('clients'), c.getUser);
router.put('/:id', protect, permit('clients'), c.updateUser);

module.exports = router;
