const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    storeName: { type: String, required: true },
    description: { type: String, required: true },
    bannerImageURL: { type: String },
    feedbacks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feedback",
      },
    ],
    positiveRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      get: (v) => Math.round(v * 10) / 10, // Làm tròn đến 1 chữ số thập phân
      set: (v) => Math.round(v * 10) / 10,
    },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const Store = mongoose.model("Store", storeSchema);

module.exports = Store;
