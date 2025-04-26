const router = require("express").Router();
const Orders = require("../controllers/order.controller");
const authenticate = require("../middleware/auth.middleware");

router.get("/view-order", authenticate, Orders.getOrder);
router.get("/:id", authenticate, Orders.getOrderById);

module.exports = router;
