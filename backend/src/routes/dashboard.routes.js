const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authRequired } = require('../middleware/auth');

router.use(authRequired);

router.get('/stats', ctrl.stats);
router.get('/quality/latest', ctrl.latestQuality);
router.get('/orders/accepted', ctrl.acceptedOrders);
router.get('/orders/material/:material', ctrl.byMaterial);
router.get('/activity', ctrl.recentActivity);

module.exports = router;
