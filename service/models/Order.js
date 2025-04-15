const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    order_date: { type: Date, required: true },
    total_amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "shipped", "delivered", "cancelled"],
        default: "pending",
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        }
    }],
}, {
    timestamps: true,
});

module.exports = mongoose.model("Order", orderSchema);
