const mongoose = require('mongoose');
const disputeSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'rejected'], default: 'open' },
    resolution: { type: String }
});

const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = Dispute;
