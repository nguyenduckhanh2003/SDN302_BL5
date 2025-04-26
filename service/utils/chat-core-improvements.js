

const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// ===== 1. DATABASE INDEXING =====
// Thêm vào file schema của bạn để tăng tốc độ truy vấn

const setupChatIndexes = () => {
  // Chỉ mục cho Conversation
  if (Conversation.schema) {
    Conversation.schema.index({ participants: 1 });
    Conversation.schema.index({ participants: 1, isActive: 1 });
    Conversation.schema.index({ updatedAt: -1 });
    Conversation.schema.index({ participants: 1, isActive: 1, updatedAt: -1 });
  }

  // Chỉ mục cho Message
  if (Message.schema) {
    Message.schema.index({ conversationId: 1, createdAt: 1 });
    Message.schema.index({ conversationId: 1, receiverId: 1, status: 1 });
    Message.schema.index({ senderId: 1, status: 1 });
  }
};

// ===== 2. PAGINATION HELPERS =====

/**
 * Tạo meta data phân trang
 * @param {number} page - Trang hiện tại
 * @param {number} limit - Số item mỗi trang
 * @param {number} total - Tổng số item
 */
const createPaginationMetadata = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

// ===== 3. OPTIMIZED QUERY HELPERS =====

/**
 * Đếm số tin nhắn chưa đọc hiệu quả bằng aggregation
 * @param {Array} conversationIds - Mảng ID cuộc hội thoại
 * @param {string} userId - ID người dùng (người nhận)
 */
const getUnreadCountsForConversations = async (conversationIds, userId) => {
  if (!conversationIds.length) return {};

  const unreadCounts = await Message.aggregate([
    {
      $match: {
        conversationId: { $in: conversationIds.map(id => mongoose.Types.ObjectId(id)) },
        receiverId: mongoose.Types.ObjectId(userId),
        status: { $ne: "read" }
      }
    },
    {
      $group: {
        _id: "$conversationId",
        count: { $sum: 1 }
      }
    }
  ]);

  // Tạo map để truy cập nhanh
  const unreadCountMap = {};
  unreadCounts.forEach(item => {
    unreadCountMap[item._id.toString()] = item.count;
  });

  return unreadCountMap;
};

/**
 * Đánh dấu tin nhắn đã đọc không chặn tiến trình
 * @param {string} conversationId - ID cuộc hội thoại
 * @param {string} userId - ID người dùng (người nhận)
 * @param {object} io - Socket.io instance (optional)
 */
const markMessagesAsReadAsync = (conversationId, userId, io = null) => {
  // Sử dụng process.nextTick để không chặn response API
  process.nextTick(async () => {
    try {
      // Tìm thông tin cuộc trò chuyện để xác định người gửi
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Xác định người gửi (người còn lại trong cuộc trò chuyện)
      const senderId = conversation.participants.find(
        participant => participant.toString() !== userId.toString()
      );

      // Cập nhật tất cả tin nhắn chưa đọc
      const result = await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: userId },
          status: { $ne: "read" }
        },
        { $set: { status: "read" } }
      );

      // Gửi thông báo qua Socket.IO nếu cần
      if (io && senderId) {
        io.emit(`message_read:${senderId}`, {
          type: "messages_read",
          conversationId,
          readBy: userId
        });
      }

      console.log(`Marked ${result.modifiedCount} messages as read in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error in markMessagesAsReadAsync:', error);
    }
  });
};

// ===== 4. ERROR HANDLING & RETRY LOGIC =====

/**
 * Thực hiện transaction với logic thử lại
 * @param {Function} transactionFn - Hàm xử lý transaction
 * @param {number} maxRetries - Số lần thử lại tối đa
 */
const executeWithRetry = async (transactionFn, maxRetries = 3) => {
  let retryCount = 0;
  
  while (true) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await transactionFn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      // Kiểm tra xem có nên thử lại không
      const isTransientError = 
        error.name === 'MongoNetworkError' || 
        error.message.includes('WriteConflict') ||
        error.code === 112;
        
      if (isTransientError && retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying transaction (${retryCount}/${maxRetries})...`);
        // Chờ một khoảng thời gian ngẫu nhiên trước khi thử lại (exponential backoff)
        const delay = Math.floor(Math.random() * Math.pow(2, retryCount) * 100);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
};

// ===== 5. PERFORMANCE MONITORING =====

/**
 * Theo dõi hiệu suất của các thao tác chat
 */
const monitorChatPerformance = () => {
  const metrics = {
    sendMessage: {
      count: 0,
      totalTime: 0,
      avgTime: 0
    },
    getHistory: {
      count: 0,
      totalTime: 0,
      avgTime: 0
    },
    markAsRead: {
      count: 0,
      totalTime: 0, 
      avgTime: 0
    }
  };

  const trackOperation = (operation, startTime) => {
    const duration = Date.now() - startTime;
    metrics[operation].count++;
    metrics[operation].totalTime += duration;
    metrics[operation].avgTime = metrics[operation].totalTime / metrics[operation].count;
  };

  const getPerformanceReport = () => {
    return {
      ...metrics,
      timestamp: new Date()
    };
  };

  return {
    trackSendMessage: (startTime) => trackOperation('sendMessage', startTime),
    trackGetHistory: (startTime) => trackOperation('getHistory', startTime),
    trackMarkAsRead: (startTime) => trackOperation('markAsRead', startTime),
    getReport: getPerformanceReport
  };
};

// Export các chức năng để sử dụng trong controllers
module.exports = {
  setupChatIndexes,
  createPaginationMetadata,
  getUnreadCountsForConversations,
  markMessagesAsReadAsync,
  executeWithRetry,
  monitorChatPerformance
};