const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  order_date: { type: Date, required: true },
  total_amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        // required: true,
        min: 1,
      },
      price: {
        type: Number,
        // required: true,
      },
      feedbackSubmitted: {
        type: Boolean,
        default: false,
      },
    },
  ],
  storeFeedbackSubmitted: {
    type: Boolean,
    default: false,
  },
},
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
