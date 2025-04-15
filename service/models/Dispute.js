const disputeSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    resolution: { type: String }
});

const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = Dispute;
