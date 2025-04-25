/**
 * Archived Message Model - For storing older chat messages
 */
const mongoose = require('mongoose');

const ArchivedMessageSchema = new mongoose.Schema(
  {
    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      trim: true
    },
    imagesUrl: [String],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },
    productRef: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      productSnapshot: {
        title: String,
        price: Number,
        imageUrl: String
      }
    },
    archivedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    // Preserve original timestamps
    createdAt: {
      type: Date,
      required: true,
      index: true
    },
    updatedAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: false // Don't auto-generate timestamps for archived messages
  }
);

// Compound indexes for efficient querying
ArchivedMessageSchema.index({ conversationId: 1, createdAt: -1 });
ArchivedMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

// Ensure the collection uses time-based sharding for better performance
ArchivedMessageSchema.set('autoIndex', process.env.NODE_ENV !== 'production');
ArchivedMessageSchema.set('collection', 'archived_messages');

module.exports = mongoose.model('ArchivedMessage', ArchivedMessageSchema);