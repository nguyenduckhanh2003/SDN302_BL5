const Order = require("../models/Order");

const getOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    const query = userId ? { user_id: userId } : {};
    const orders = await Order.find(query)
      .populate("user_id", "fullname email")
      .populate({
        path: "items.productId",
        populate: {
          path: "storeId",
          select: "storeName positiveRate totalReviews",
        },
        
      });
    res.status(200).json(orders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Lỗi khi lấy đơn hàng", error: err.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user_id", "fullname email")
      .populate({
        path: "items.productId",
        populate: {
          path: "storeId",
          select: "storeName positiveRate totalReviews",
        },
      });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json({ data: order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getOrder, getOrderById };
