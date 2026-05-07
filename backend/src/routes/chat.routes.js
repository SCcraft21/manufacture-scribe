const router = require('express').Router();
const ctrl = require('../controllers/chat.controller');
const validate = require('../middleware/validate');
const { authRequired } = require('../middleware/auth');
const { chatSchema } = require('../validators/order.validator');

router.post('/', authRequired, validate(chatSchema), ctrl.handle);

module.exports = router;
