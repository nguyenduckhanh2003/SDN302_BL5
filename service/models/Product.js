const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: {
      type: Number,
      required: true,
    },
    // Các trường khác giữ nguyên
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: ["available", "unavailable"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    isAuction: { type: Boolean, default: false },
    totalReviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
        required: true,
      },
    ],
    averageRating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      get: (v) => Math.round(v * 100) / 100,
      set: (v) => Math.round(v * 100) / 100,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true }, // Quan trọng: Đảm bảo getters được sử dụng khi chuyển sang JSON
    toObject: { getters: true }, // Quan trọng: Đảm bảo getters được sử dụng khi chuyển sang Object
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
