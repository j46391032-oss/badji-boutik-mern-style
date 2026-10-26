const router = require('express').Router();
const c = require('../controllers/teamController');
const { protect, ownerOnly } = require('../middleware/auth');

// Tout ce sous-espace est réservé à l'administrateur du projet
router.use(protect, ownerOnly);
router.get('/', c.getTeam);
router.get('/log', c.getLog); // avant /:id
router.get('/security', c.getSecurityEvents);
router.post('/', c.createMember);
router.put('/:id', c.updateMember);
router.delete('/:id', c.removeMember);

module.exports = router;
