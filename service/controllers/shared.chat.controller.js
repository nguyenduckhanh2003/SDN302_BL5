const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const ArchivedMessage = require("../models/ArchiveMessage");
const chatMetrics = require("../utils/chat.metrics");
const { groupMessagesByDate } = require("../utils/formatDate");
const chatCache = require("../redis/chat.cache");

/**
 * Mark messages as read
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Find conversation to get sender info
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Identify sender (other participant in conversation)
    const senderId = conversation.participants.find(
      (participant) => participant.toString() !== userId.toString()
    );

    // Update all unread messages where user is receiver
    const result = await Message.updateMany(
      {
        conversationId: conversationId,
        senderId: { $ne: userId },
        status: { $ne: "read" },
      },
      {
        $set: { status: "read" },
      }
    );

    // Clear unread count in cache
    await chatCache.resetUnreadCount(conversationId, userId);

    // Send notification via Socket.IO
    if (req.io) {
      req.io.emit(`message_read:${senderId}`, {
        type: "messages_read",
        conversationId: conversationId,
        readBy: userId,
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      data: {
        updated: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while marking messages as read",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get conversation history with pagination and caching
 */
const getConversationHistory = async (req, res) => {
  const startTime = Date.now();
  const { conversationId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  try {
    // 1. Kiểm tra access control trước (nhanh)
    // Chỉ kiểm tra quyền truy cập, không populate dữ liệu
    const hasAccess = await Conversation.exists({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

    if (!hasAccess) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found or access denied",
      });
    }

    // 2. Thử lấy tin nhắn từ cache
    const cachedMessages = await chatCache.getMessages(
      conversationId,
      page,
      limit
    );

    if (cachedMessages) {
      console.log(
        "Nhận được tin nhắn từ cache:",
        cachedMessages.messages.length
      );
      // Đánh dấu tin nhắn đã đọc trong background
      markMessagesAsReadAsync(conversationId, userId, req.io);
      chatMetrics.trackCacheHit("conversation_history");

      // 3. Nếu có cache, lấy thông tin conversation riêng biệt
      // Chỉ lấy thông tin cần thiết, không lấy message history
      const conversation = await Conversation.findById(conversationId)
        .populate({
          path: "participants",
          select: "_id fullname avatar",
          match: { _id: { $ne: userId } }, // Chỉ lấy thông tin người còn lại
        })
        .populate({
          path: "products.productId",
          select: "title price url",
        })
        .lean();

      // 4. Kết hợp dữ liệu và trả về
      return res.status(200).json({
        success: true,
        data: {
          conversation,
          messages: cachedMessages.messages,
          messagesByDate: cachedMessages.messagesByDate,
          pagination: cachedMessages.pagination,
          hasArchivedMessages: cachedMessages.hasArchivedMessages || false,
        },
      });
    }

    // 5. Nếu không có cache, lấy tin nhắn từ database
    // Tính toán pagination
    const skip = (page - 1) * limit;

    // Pipeline để lấy tin nhắn và conversation cùng lúc
    const [conversation, normalMessageCount, archivedMessageCount] =
      await Promise.all([
        // Lấy thông tin conversation
        Conversation.findById(conversationId)
          .populate({
            path: "participants",
            select: "_id fullname avatar",
          })
          .populate({
            path: "products.productId",
            select: "title price url",
          })
          .lean(),

        // Đếm tin nhắn thông thường
        Message.countDocuments({ conversationId }),

        // Đếm tin nhắn đã lưu trữ
        ArchivedMessage.countDocuments({ conversationId }),
      ]);
    const totalPageNormalMessages = Math.ceil(normalMessageCount / limit);
    const includeArchived = page > totalPageNormalMessages ? true : false;
    // Tổng số tin nhắn (cả thường và đã lưu trữ)
    const totalMessages = normalMessageCount + archivedMessageCount;

    // Xác định từ đâu lấy tin nhắn
    let messages = [];
    let hasArchivedMessages = archivedMessageCount > 0;
    // Nếu có tin nhắn đã lưu trữ, kiểm tra xem có cần lấy hay không
    if (includeArchived && archivedMessageCount > 0) {
      // Nếu cần lấy cả tin nhắn đã lưu trữ, sử dụng logic phức tạp hơn

      // Xác định nếu trang hiện tại chứa tin nhắn đã lưu trữ
      const normalMessagePages = Math.ceil(normalMessageCount / limit);
      if (page > normalMessagePages) {
        // Trang này chỉ chứa tin nhắn đã lưu trữ
        const archivedSkip = (page - normalMessagePages - 1) * limit;

        messages = await ArchivedMessage.find({ conversationId })
          .sort({ createdAt: -1 })
          .skip(archivedSkip)
          .limit(limit)
          .populate({
            path: "senderId",
            select: "_id fullname avatar",
          })
          .lean();
      } else if (
        page === normalMessagePages &&
        normalMessageCount % limit !== 0
      ) {
        // Trang này chứa cả tin nhắn thường và đã lưu trữ
        const normalMessages = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate({
            path: "senderId",
            select: "_id fullname avatar",
          })
          .lean();

        const remainingLimit = limit - normalMessages.length;

        if (remainingLimit > 0) {
          const archivedMessages = await ArchivedMessage.find({
            conversationId,
          })
            .sort({ createdAt: -1 })
            .limit(remainingLimit)
            .populate({
              path: "senderId",
              select: "_id fullname avatar",
            })
            .lean();

          messages = [...normalMessages, ...archivedMessages];
        } else {
          messages = normalMessages;
        }
      } else {
        // Trang này chỉ chứa tin nhắn thường
        messages = await Message.find({ conversationId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate({
            path: "senderId",
            select: "_id fullname avatar",
          })
          .lean();
      }
    } else {
      // Nếu không lấy tin nhắn đã lưu trữ, sử dụng logic đơn giản như cũ
      messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "senderId",
          select: "_id fullname avatar",
        })
        .lean();
    }

    // Sắp xếp lại tin nhắn theo thứ tự thời gian
    const orderedMessages = messages.reverse();

    // Nhóm tin nhắn theo ngày
    const messagesByDate = groupMessagesByDate(orderedMessages);

    // Tạo metadata phân trang
    const pagination = {
      page,
      limit,
      totalPages: Math.ceil(totalMessages / limit),
      totalItems: totalMessages,
      hasNextPage: skip + limit < totalMessages,
      hasPrevPage: page > 1,
    };

    // Lưu vào cache
    await chatCache.setMessages(
      conversationId,
      orderedMessages,
      messagesByDate,
      pagination,
      page,
      limit,
      hasArchivedMessages
    );

    // Đánh dấu tin nhắn đã đọc
    markMessagesAsReadAsync(conversationId, userId, req.io);

    // Theo dõi hiệu suất
    chatMetrics.trackGetHistory(startTime);

    // Trả về kết quả
    return res.status(200).json({
      success: true,
      data: {
        conversation,
        messages: orderedMessages,
        messagesByDate,
        pagination,
        hasArchivedMessages,
      },
    });
  } catch (error) {
    console.error("Error in getConversationHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving message history",
      error: error.message,
    });
  }
};

/**
 * Mark messages as read asynchronously (not blocking response)
 */
const markMessagesAsReadAsync = async (conversationId, userId, io) => {
  try {
    // Find conversation to get sender info
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return;

    // Identify sender
    const senderId = conversation.participants.find(
      (participant) => participant.toString() !== userId.toString()
    );

    // Update all unread messages where user is receiver
    const result = await Message.updateMany(
      {
        conversationId: conversationId,
        senderId: { $ne: userId },
        status: { $ne: "read" },
      },
      {
        $set: { status: "read" },
      }
    );

    // Clear cache for unread counts
    await chatCache.resetUnreadCount(conversationId, userId);

    // Send notification via Socket.IO
    if (io && result.modifiedCount > 0) {
      io.emit(`message_read:${senderId}`, {
        type: "messages_read",
        conversationId: conversationId,
        readBy: userId,
      });
    }
  } catch (error) {
    console.error("Error in markMessagesAsReadAsync:", error);
  }
};

module.exports = {
  markMessagesAsRead,
  getConversationHistory,
  markMessagesAsReadAsync,
};
