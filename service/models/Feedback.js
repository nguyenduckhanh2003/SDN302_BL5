const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    averageRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
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

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
