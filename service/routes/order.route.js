const router = require('express').Router();
const order = require('../controllers/order.controller');
const authenticate = require('../middleware/auth.middleware');

router.use(authenticate)
router.get('/orders', order.getOrders);

router.get("/orders/view-order", order.getOrder);
router.get("/orders/:id", order.getOrderById);

module.exports = router;
