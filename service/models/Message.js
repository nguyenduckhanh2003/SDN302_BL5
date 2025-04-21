const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
    },
    imagesUrl: [
        {
            type: String,
        }
    ],
    productRef: {  // Tham chiếu đến sản phẩm trong tin nhắn (nếu có)
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productSnapshot: {  // Lưu thông tin sản phẩm tại thời điểm gửi
            title: String,
            price: Number,
            imageUrl: String
        }
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;