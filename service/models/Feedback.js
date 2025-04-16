const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
