const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  storeName: { type: String, required: true },
  description: { type: String, required: true },
  bannerImageURL: { type: String },
  positiveRate: {
    type: Number,
    required: true,
  },
  totalReviews: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
});

const Store = mongoose.model("Store", storeSchema);

module.exports = Store;
