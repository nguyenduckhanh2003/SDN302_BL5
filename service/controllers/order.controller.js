const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const getOrders = async (req, res) => {
    try {
        const _id = req.user._id;
        console.log(req.user.role);

        const orders = await Order.find({ user_id: _id }).populate("user_id").populate("items.productId");

        if (!orders) {
            return res.status(404).json({ error: "Orders not found" });
        }

        return res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getOrders };