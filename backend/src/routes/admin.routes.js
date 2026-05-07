const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { authRequired, requireRole } = require('../middleware/auth');

router.use(authRequired, requireRole('admin'));

router.get('/analytics', ctrl.analytics);
router.get('/users', ctrl.listUsers);

module.exports = router;
