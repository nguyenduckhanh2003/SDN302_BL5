const express = require('express');
const router = express.Router();
const orderController = require('../controllers/ordermanagersell.controller');
const authenticate = require('../middleware/auth.middleware');
const sellerMiddleware = require('../middleware/seller.middleware');

// Chỉ seller mới được dùng
router.post('/', authenticate, sellerMiddleware, orderController.createOrder);
router.get('/stats', authenticate, sellerMiddleware, orderController.getOrderStats);
router.get('/', authenticate, sellerMiddleware, orderController.getAllOrders);

router.get('/:id', authenticate, sellerMiddleware, orderController.getOrderById);
router.put('/:id/status', authenticate, sellerMiddleware, orderController.updateOrderStatus);
router.put('/:id/cancel', authenticate, sellerMiddleware, orderController.cancelOrder);


module.exports = router;
