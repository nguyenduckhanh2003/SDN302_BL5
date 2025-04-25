const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    products: [{  // Danh sách các sản phẩm đã thảo luận trong cuộc trò chuyện này
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
// Tạo index cho truy vấn hiệu quả
conversationSchema.index({ participants: 1 });
conversationSchema.index({ participants: 1, isActive: 1, updatedAt: -1 });


const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;