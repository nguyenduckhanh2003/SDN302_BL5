const Product = require("../models/Product");
const Category = require("../models/Category");
const Store = require("../models/Store");

const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).populate("categoryId").populate("storeId");
        res.status(200).json({
            data: products
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("categoryId").populate("storeId");
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.status(200).json({
            data: product
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getProducts, getProductById };