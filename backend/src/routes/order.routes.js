const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const validate = require('../middleware/validate');
const { authRequired, requireRole } = require('../middleware/auth');
const { createOrderSchema, updateStatusSchema, qualitySchema } = require('../validators/order.validator');

router.use(authRequired);

router.get('/', ctrl.list);
router.post('/', validate(createOrderSchema), ctrl.create);
router.get('/:orderNumber', ctrl.getOne);
router.patch('/:orderNumber/status', requireRole('ops', 'admin'), validate(updateStatusSchema), ctrl.updateStatus);
router.post('/:orderNumber/quality', requireRole('ops', 'admin'), validate(qualitySchema), ctrl.addQuality);
router.get('/:orderNumber/summary', ctrl.summary);

module.exports = router;
