const Product = require("../models/Product");
const Category = require("../models/Category");
const Store = require("../models/Store");
const mongoose = require("mongoose");
const getStore = async (req, res) => {
  try {
    const store = await Store.find({}).populate("seller").populate("feedbacks");
    res.status(200).json({
      data: store,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem id có phải là ObjectId hợp lệ không
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid store ID" });
    }

    const store = await Store.findById(id)
      .populate("seller")
      .populate("feedbacks");
    if (!store) {
      return res.status(404).json({ error: "Store not found" }); // Sửa "Product not found" thành "Store not found"
    }
    res.status(200).json({
      data: store,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getStore, getStoreById };
