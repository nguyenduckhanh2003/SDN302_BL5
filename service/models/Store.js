const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: { type: String, required: true },
    description: { type: String, required: true },
    bannerImageURL: { type: String },
    totalReviews: {
        type: Number,
        required: true,
        default: 0,
    },
    positiveRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
