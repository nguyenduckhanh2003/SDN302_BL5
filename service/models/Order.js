const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    }
});

const orderSchema = new mongoose.Schema({
    user_id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true 
    },
    order_date: { 
        type: Date, 
        default: Date.now,
        required: true 
    },
    total_amount: { 
        type: Number, 
        required: true 
    },
    shipping_address: {
        type: String,
        required: true
    },
    payment_method: {
        type: String,
        enum: ["cod", "bank_transfer", "momo", "vnpay"],
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        default: "pending",
    },
    items: [orderItemSchema],
    tracking_number: String,
    notes: String
}, {
    timestamps: true,
});
orderSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Order", orderSchema);