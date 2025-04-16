const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: { type: String, required: true },
    description: { type: String, required: true },
    bannerImageURL: { type: String }
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
