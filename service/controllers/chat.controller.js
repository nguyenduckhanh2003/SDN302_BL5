const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Product = require("../models/Product");
const Store = require("../models/Store");
const { groupMessagesByDate } = require("../utils/formatDate");

const sendChatWithProduct = async (req, res) => {
  const { sellerId, productId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;
  try {
    const { message } = req.body;
    const buyerId = req.user._id;

    let conversation;
    let imageUrls = [];
    let productData = null;

    // Xử lý tải lên hình ảnh
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => file.path);
    }

    // Lấy thông tin sản phẩm nếu có
    if (productId) {
      productData = await Product.findById(productId).lean();
    }

    // Tìm cuộc trò chuyện hiện có giữa người mua và người bán
    conversation = await Conversation.findOne({
      participants: { $all: [buyerId, sellerId] },
    }).session(session);

    if (!conversation) {
      // Tạo cuộc trò chuyện mới
      conversation = await Conversation.create(
        [
          {
            participants: [buyerId, sellerId],
            products: productId ? [{ productId, addedAt: new Date() }] : [],
            isActive: true,
          },
        ],
        { session }
      );

      conversation = conversation[0];
    } else if (productId) {
      // Nếu là sản phẩm mới, thêm vào danh sách sản phẩm của cuộc trò chuyện
      const productExists = conversation.products.some(
        (p) => p.productId.toString() === productId
      );

      if (!productExists) {
        await Conversation.updateOne(
          { _id: conversation._id },
          { $push: { products: { productId, addedAt: new Date() } } },
          { session }
        );
      }
    }

    // Tạo tin nhắn mới
    const newMessages = [];

    // Nếu có nội dung tin nhắn văn bản
    if (message && message.trim()) {
      const messageData = {
        senderId: buyerId,
        receiverId: sellerId,
        content: message.trim(),
        status: "sent",
        conversationId: conversation._id,
      };

      // Thêm tham chiếu sản phẩm nếu có
      if (productData) {
        messageData.productRef = {
          productId: productId,
          productSnapshot: {
            title: productData.title,
            price: productData.price,
            imageUrl: productData.url ? productData.url : null,
          },
        };
      }

      const textMessage = await Message.create([messageData], { session });
      newMessages.push(textMessage[0]);
    }

    // Tạo tin nhắn hình ảnh
    if (imageUrls.length > 0) {

        const imageMessage = await Message.create(
          [
            {
              senderId: buyerId,
              receiverId: sellerId,
              imagesUrl: imageUrls,
              status: "sent",
              conversationId: conversation._id,
              productRef: productData
                ? {
                    productId: productId,
                    productSnapshot: {
                      title: productData.title,
                      price: productData.price,
                      imageUrl: productData.url ? productData.url : null,
                    },
                  }
                : undefined,
            },
          ],
          { session }
        );

        newMessages.push(imageMessage[0]);
    }

    // Cập nhật tin nhắn cuối cùng
    if (newMessages.length > 0) {
      const lastMessageId = newMessages[newMessages.length - 1]._id;
      await Conversation.findByIdAndUpdate(
        conversation._id,
        { lastMessage: lastMessageId },
        { session }
      );
    }

    await session.commitTransaction();
    committed = true; // Đánh dấu đã commit
    session.endSession();

    if (req.io && newMessages.length > 0) {
      try {
        newMessages.forEach((msg) => {
          console.log("Sending message to socket");
          req.io.emit(`message:${sellerId}`, {
            message: msg,
            conversation: conversation._id,
            type: "new_message",
          });
        });
      } catch (socketError) {
        console.error("Socket error:", socketError);
        // Lỗi socket không ảnh hưởng đến transaction nữa
      }
    }

    res.status(201).json({
      success: true,
      data: {
        conversation: conversation._id,
        messages: newMessages,
      },
    });
  } catch (error) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Lỗi khi abort transaction:", abortError);
      }
    } else if (session) {
      // Nếu đã commit nhưng session vẫn còn mở
      session.endSession();
    }

    console.error("Lỗi khi gửi tin nhắn:", error);
    res.status(500).json({
      success: false,
      message: "Không thể gửi tin nhắn",
      error: error.message,
    });
  }
};

const sendChatBuyer = async (req, res) => {
  const session = await mongoose.startSession();
  let committed = false;
  try {
    await session.startTransaction();
    const { message, buyerId } = req.body;
    const sellerId = req.user._id;
    const imageUrls = [];

    // Process uploaded images
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        imageUrls.push(file.path);
      });
    }

    // Find existing conversation between buyer and seller
    let conversation = await Conversation.findOne({
      participants: { $all: [buyerId, sellerId] },
    }).session(session);

    if (!conversation) {
      // Create new conversation if it doesn't exist
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
        // Explicitly set productRef to null or omit it
        productRef: null,
      };
      const textMessage = await Message.create([messageData], { session });
      newMessages.push(textMessage[0]);
    }

    // Add image messages if provided
    if (imageUrls.length > 0) {
        const imageMessage = await Message.create(
          [
            {
              senderId: sellerId,
              receiverId: buyerId,
              imagesUrl: imageUrls,
              status: "sent",
              conversationId: conversation._id,
              // Explicitly set productRef to null
              productRef: null,
            },
          ],
          { session }
        );
        newMessages.push(imageMessage[0]);
    }

    // Update conversation with last message
    if (newMessages.length > 0) {
      const lastMessageId = newMessages[newMessages.length - 1]._id;
      await Conversation.findByIdAndUpdate(
        conversation._id,
        { lastMessage: lastMessageId },
        { session }
      );
    }

    await session.commitTransaction();
    committed = true;
    session.endSession();

    res.status(201).json({
      success: true,
      data: {
        conversation: conversation._id,
        messages: newMessages,
      },
    });
  } catch (error) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Lỗi khi abort transaction:", abortError);
      }
    } else if (session) {
      // Nếu đã commit nhưng session vẫn còn mở
      session.endSession();
    }
    return res.status(500).json({
      success: false,
      message: "Could not process the message",
      error: error.message,
    });
  }
};

const sendChatToSeller = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();
    const { message, conversationId, sellerId } = req.body;
    const buyerId = req.user._id;
    const imageUrls = [];

    // Process uploaded images
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        imageUrls.push(file.path);
      });
    }

    // Find existing conversation between buyer and seller
    let conversation = await Conversation.findOne({
      _id: conversationId,
    }).session(session);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Create new messages
    const newMessages = [];

    // Add text message if provided
    if (message && message.trim()) {
      const messageData = {
        senderId: buyerId,
        receiverId: sellerId,
        content: message.trim(),
        status: "sent",
        conversationId: conversation._id,
        // Explicitly set productRef to null or omit it
        productRef: null,
      };
      const textMessage = await Message.create([messageData], { session });
      newMessages.push(textMessage[0]);
    }

    // Add image messages if provided
    if (imageUrls.length > 0) {
        const imageMessage = await Message.create(
          [
            {
              senderId: buyerId,
              receiverId: sellerId,
              imagesUrl: imageUrls,
              status: "sent",
              conversationId: conversation._id,
              // Explicitly set productRef to null
              productRef: null,
            },
          ],
          { session }
        );
        newMessages.push(imageMessage[0]);
    }

    // Update conversation with last message
    if (newMessages.length > 0) {
      const lastMessageId = newMessages[newMessages.length - 1]._id;
      await Conversation.findByIdAndUpdate(
        conversation._id,
        { lastMessage: lastMessageId },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Gửi thông báo qua Socket.IO

    if (req.io && newMessages.length > 0) {
      try {
        newMessages.forEach((msg) => {
          console.log("Sending message to socket");
          req.io.emit(`message:${sellerId}`, {
            message: msg,
            conversation: conversation._id,
            type: "new_message",
          });
        });
      } catch (socketError) {
        console.error("Socket error:", socketError);
        // Lỗi socket không ảnh hưởng đến transaction nữa
      }
    }

    res.status(201).json({
      success: true,
      data: {
        conversation: conversation._id,
        messages: newMessages,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Could not process the message",
      error: error.message,
    });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Tìm cuộc trò chuyện để lấy thông tin người gửi
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Xác định người gửi (người còn lại trong cuộc hội thoại)
    const senderId = conversation.participants.find(
      (participant) => participant.toString() !== userId.toString()
    );

    // Update all unread messages where the user is the receiver
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

    // Gửi thông báo qua Socket.IO
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

const getConversationsSeller = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID người dùng từ middleware xác thực

    // Tìm tất cả các cuộc trò chuyện mà người dùng tham gia
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate({
        path: "participants",
        select: "_id fullname avatar", // Chỉ lấy thông tin cần thiết của người dùng
      })
      .populate({
        path: "lastMessage",
        select: "content imageUrl senderId status timestamp",
      })
      .populate({
        path: "products.productId",
        select: "title price url",
      })
      .sort({ updatedAt: -1 }); // Sắp xếp theo thời gian cập nhật mới nhất

    // Định dạng dữ liệu trả về
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Xác định người dùng còn lại trong cuộc trò chuyện
        const otherUser = conv.participants.find(
          (participant) => participant._id.toString() !== userId.toString()
        );
        // Đếm tin nhắn chưa đọc
        const unreadMessagesQuery = {
          conversationId: conv._id,
          receiverId: userId,
          status: { $ne: "read" },
        };

        const unreadMessages = await Message.find(unreadMessagesQuery);
        const unreadCount = unreadMessages.length;
        // Lấy danh sách sản phẩm với snapshot
        const products = conv.products.map((product) => {
          // Sử dụng productSnapshot nếu có, nếu không lấy từ product
          const productData = product.productId || {};
          return {
            productId: product.productId?._id || product.productId,
            title: productData.title || "Sản phẩm",
            price: productData.price || 0,
            imageUrl: productData.imageUrl || null,
            addedAt: product.addedAt,
          };
        });

        return {
          conversationId: conv._id,
          buyer: otherUser || { fullname: "Người dùng", avatar: null },
          lastMessage: conv.lastMessage,
          products: products,
          updatedAt: conv.updatedAt,
          unreadCount: unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: formattedConversations,
    });
  } catch (error) {
    console.error("Error in getConversations:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách hội thoại",
      error: error.message,
    });
  }
};

const getConversationHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Kiểm tra xem cuộc trò chuyện có tồn tại và người dùng có quyền truy cập không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    })
      .populate({
        path: "participants",
        select: "_id fullname avatar",
      })
      .populate({
        path: "products.productId",
        select: "title price url",
      });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền truy cập",
      });
    }

    // Lấy tin nhắn của cuộc trò chuyện theo thứ tự thời gian
    const messages = await Message.find({
      conversationId: conversationId,
    })
      .sort({ createdAt: 1 })
      .populate({
        path: "senderId",
        select: "_id fullname avatar",
      });

    // Tạo danh sách ngày để hiển thị tin nhắn theo ngày
    const messagesByDate = groupMessagesByDate(messages);

    return res.status(200).json({
      success: true,
      data: {
        conversation: conversation,
        messages: messages,
        messagesByDate: messagesByDate,
      },
    });
  } catch (error) {
    console.error("Error in getConversationHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử tin nhắn",
      error: error.message,
    });
  }
};

const getBuyerConversations = async (req, res) => {
  try {
    const buyerId = req.user._id;

    // Sử dụng Mongoose query thông thường thay vì aggregation
    const conversations = await Conversation.find({
      participants: buyerId,
      isActive: true,
    })
      .populate({
        path: "participants",
        select: "fullname avatar",
        match: { _id: { $ne: buyerId } },
      })
      .populate({
        path: "lastMessage",
        select: "content timestamp status", // Lấy nội dung và thời gian tin nhắn cuối
      })
      .sort({ updatedAt: -1 });
    const listStore = await Store.find();
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Lấy người bán (người tham gia còn lại)
        const seller = conv.participants.find((p) => p);
        const store = listStore.find(
          (store) => store.seller.toString() === seller._id.toString()
        );
        // Đếm tin nhắn chưa đọc
        const unreadMessagesQuery = {
          conversationId: conv._id,
          receiverId: buyerId,
          status: { $ne: "read" },
        };

        const unreadMessages = await Message.find(unreadMessagesQuery);
        const unreadCount = unreadMessages.length;
        return {
          _id: conv._id,
          seller: seller || { name: "Unknown", avatar: null },
          store: store || { name: "Unknown", avatar: null },
          lastMessage: conv.lastMessage,
          updatedAt: conv.updatedAt,
          createdAt: conv.createdAt,
          unreadCount: unreadCount,
        };
      })
    );
    return res.status(200).json({
      success: true,
      data: formattedConversations,
    });
  } catch (error) {
    console.error("Error fetching buyer conversations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: error.message,
    });
  }
};

const getConversationMessagesBuyer = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const buyerId = req.user._id;

    // Validate conversationId
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    // Verify user belongs to this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: buyerId,
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this conversation",
      });
    }

    // Get messages with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find the seller (for UI info)
    const sellerId = conversation.participants.find(
      (participant) => participant.toString() !== buyerId.toString()
    );

    // Get messages
    const messages = await Message.find({
      conversationId: conversationId,
    })
      .sort({ timestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .lean();

    // Identify current product being discussed
    const products = conversation.products || [];
    const currentProduct =
      products.length > 0
        ? products.sort((a, b) => b.addedAt - a.addedAt)[0]
        : null;

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: conversationId,
        senderId: { $ne: buyerId }, // Messages not sent by the buyer
        status: { $ne: "read" },
      },
      { $set: { status: "read" } }
    );

    return res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        conversation,
        currentProduct,
        hasMore: messages.length === limit, // For pagination
        page,
      },
    });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

const getConversationProducts = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const buyerId = req.user._id;

    // Verify user belongs to this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: buyerId,
    }).populate({
      path: "products.productId",
      select: "title price images description isAvailable",
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this conversation",
      });
    }

    // Sort products by most recently added
    const products = conversation.products.sort(
      (a, b) => b.addedAt - a.addedAt
    );

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching conversation products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

const getConversationDetailBuyer = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID người dùng từ middleware xác thực
    const { sellerId } = req.query;
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "sellerId is required",
      });
    }
    // Tìm tất cả các cuộc trò chuyện mà người dùng tham gia
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, sellerId] },
      isActive: true,
    })
      .populate({
        path: "participants",
        select: "_id fullname avatar", // Chỉ lấy thông tin cần thiết của người dùng
      })
      .populate({
        path: "lastMessage",
        select: "content imageUrl senderId status timestamp",
      })
      .populate({
        path: "products.productId",
        select: "title price url",
      })
      .sort({ updatedAt: -1 }); // Sắp xếp theo thời gian cập nhật mới nhất
    if (!conversation) {
      return res.status(200).json({
        success: false,
        message: "Không tìm thấy cuộc hội thoại giữa người mua và người bán",
      });
    }

    // Count unread messages
    const unreadMessagesQuery = {
      conversationId: conversation._id,
      receiverId: userId,
      status: { $ne: "read" },
    };

    const unreadCount = await Message.countDocuments(unreadMessagesQuery);

    // Lấy tin nhắn của cuộc trò chuyện theo thứ tự thời gian
    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate({
        path: "senderId",
        select: "_id fullname avatar",
      });

    // Tạo danh sách ngày để hiển thị tin nhắn theo ngày
    const messagesByDate = groupMessagesByDate(messages);

    return res.status(200).json({
      success: true,
      data: {
        conversation: conversation,
        messages: messages,
        messagesByDate: messagesByDate,
      },
    });
  } catch (error) {
    console.error("Error in getConversationDetailBuyer:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin hội thoại",
      error: error.message,
    });
  }
};
module.exports = {
  sendChatWithProduct,
  sendChatBuyer,
  sendChatToSeller,
  getConversationsSeller,
  getConversationHistory,
  markMessagesAsRead,
  getBuyerConversations,
  getConversationMessagesBuyer,
  getConversationProducts,
  getConversationDetailBuyer,
};
