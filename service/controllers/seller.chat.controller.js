/**
 * Get all conversations for a seller with pagination, efficient caching
 */


const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const chatMetrics = require("../utils/chat.metrics");
const chatCache = require("../redis/chat.cache");
const { executeWithRetry } = require("../helper/transaction.helper");

const getConversationsSeller = async (req, res) => {
  const startTime = Date.now();

  try {
    const userId = req.user._id;

    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get conversations with efficient projection
    const conversations = await Conversation.find(
      { participants: userId, isActive: true },
      { participants: 1, products: 1, lastMessage: 1, updatedAt: 1 }
    )
      .populate({
        path: "participants",
        select: "_id fullname avatar",
        match: { _id: { $ne: userId } }, // Only get other user's info
      })
      .populate({
        path: "lastMessage",
        select: "content imagesUrl senderId status createdAt",
      })
      .populate({
        path: "products.productId",
        select: "title price url",
      })
      .sort({ updatedAt: -1 }) // Sort by most recently updated
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain JS object for better performance

    // Count total conversations for pagination
    const totalCount = await Conversation.countDocuments({
      participants: userId,
      isActive: true,
    });

    // Get all conversation IDs
    const conversationIds = conversations.map((conv) => conv._id);

    // Get unread counts for all conversations in a single query
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          receiverId: userId,
          status: { $ne: "read" },
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Create a map for O(1) lookup
    const unreadCountMap = {};
    unreadCounts.forEach((item) => {
      unreadCountMap[item._id.toString()] = item.count;
    });

    // Format the response data
    const formattedConversations = conversations.map((conv) => {
      // Get other user (buyer)
      const buyer = conv.participants[0] || { fullname: "User", avatar: null };

      // Format product info
      const products = (conv.products || []).map((product) => {
        const productData = product.productId || {};
        return {
          productId: productData._id || product.productId,
          title: productData.title || "Product",
          price: productData.price || 0,
          imageUrl: productData.url || null,
          addedAt: product.addedAt,
        };
      });

      // Get unread count from map (default 0)
      const unreadCount = unreadCountMap[conv._id.toString()] || 0;

      return {
        conversationId: conv._id,
        buyer: buyer,
        lastMessage: conv.lastMessage,
        products: products,
        updatedAt: conv.updatedAt,
        unreadCount: unreadCount,
      };
    });

    // Create pagination metadata
    const pagination = {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalItems: totalCount,
      hasNextPage: skip + limit < totalCount,
      hasPrevPage: page > 1,
    };

    const responseData = {
      success: true,
      data: formattedConversations,
      pagination,
    };

    // Track performance
    chatMetrics.trackGetSellerConversations(startTime);

    // Return the result
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in getConversationsSeller:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving conversation list",
      error: error.message,
    });
  }
};

/**
 * Send chat message from seller to buyer
 */
const sendChatBuyer = async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, buyerId } = req.body;
    const sellerId = req.user._id;

    // Use executeWithRetry for automatic retries on temporary errors
    const result = await executeWithRetry(async (session) => {
      const imageUrls = [];

      // Process uploaded images
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          imageUrls.push(file.path);
        });
      }

      // Find or create conversation
      let conversation = await Conversation.findOne(
        {
          participants: { $all: [buyerId, sellerId] },
        },
        { _id: 1 }
      ).session(session);
      console.log(conversation);
      if (!conversation) {
        // Create new conversation if doesn't exist
        conversation = await Conversation.create(
          [
            {
              participants: [buyerId, sellerId],
              isActive: true,
            },
          ],
          { session }
        );
        conversation = conversation[0];
      }

      // Create new messages
      const newMessages = [];

      // Add text message if provided
      if (message && message.trim()) {
        const messageData = {
          senderId: sellerId,
          receiverId: buyerId,
          content: message.trim(),
          status: "sent",
          conversationId: conversation._id,
          productRef: null,
        };
        const textMessage = await Message.create([messageData], { session });
        newMessages.push(textMessage[0]);
      }

      // Add image message if provided
      if (imageUrls.length > 0) {
        const imageMessage = await Message.create(
          [
            {
              senderId: sellerId,
              receiverId: buyerId,
              imagesUrl: imageUrls,
              status: "sent",
              conversationId: conversation._id,
              productRef: null,
            },
          ],
          { session }
        );
        newMessages.push(imageMessage[0]);
      }

      // Update conversation's last message
      if (newMessages.length > 0) {
        const lastMessageId = newMessages[newMessages.length - 1]._id;
        await Conversation.findByIdAndUpdate(
          conversation._id,
          { lastMessage: lastMessageId },
          { session }
        );
      }

      return {
        conversation: conversation._id,
        messages: newMessages,
      };
    });

    if (result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];

      // Vẫn giữ invalidate conversation và increment unread
      await chatCache.invalidateConversation(result.conversation.toString());
      await chatCache.incrementUnreadCount(
        result.conversation.toString(),
        buyerId
      );
    }
    // Track performance
    chatMetrics.trackSendMessage(startTime);

    return res.status(201).json({
      success: true,
      data: {
        conversation: result.conversation,
        messages: result.messages,
      },
    });
  } catch (error) {
    console.error("Error in sendChatBuyer:", error);
    return res.status(500).json({
      success: false,
      message: "Could not process the message",
      error: error.message,
    });
  }
};

module.exports = {
  sendChatBuyer,
  getConversationsSeller,
};
