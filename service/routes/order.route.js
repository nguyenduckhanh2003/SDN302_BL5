const router = require('express').Router();
const order = require('../controllers/order.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate)
router.get('/orders', order.getOrders);

module.exports = router;