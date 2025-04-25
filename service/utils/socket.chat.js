// socketServer.js
const { Server } = require("socket.io");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const {
  generateSessionKey,
  decryptMessage,
  encryptMessage,
} = require("./socketUtil");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*", // Cho phép tất cả origins trong development
      methods: ["GET", "POST"],
      credentials: true,
      secure: true,
    },
    transports: ["websocket", "polling"], // Hỗ trợ cả WebSocket và HTTP long-polling
    pingTimeout: 30000,
    pingInterval: 25000,
    cookie: {
      name: "io",
      httpOnly: true,
      secure: true, // Chỉ sử dụng cookie qua HTTPS
    },
  });

  // Map để lưu trữ thông tin người dùng đang online
  const onlineUsers = new Map();
  // Map lưu trữ khóa bảo mật cho mỗi người dùng
  const userEncryptionKeys = new Map();

  // Xử lý khi có client kết nối đến
  io.on("connection", (socket) => {
    // Thiết lập kênh bảo mật khi người dùng kết nối
    socket.on("establish_secure_channel", (userId) => {
      if (!userId) return;

      // Tạo khóa phiên mới cho người dùng
      const sessionKey = generateSessionKey();
      userEncryptionKeys.set(userId, sessionKey);

      // Gửi khóa phiên cho client
      socket.emit("secure_channel_established", { sessionKey });
    });

    // Xử lý khi người dùng đăng nhập và kết nối
    socket.on("user_connect", (userId ) => {
      if (!userId) return;

      console.log(`User ${userId} connected with socket ${socket.id}`);

      // Lưu thông tin socket ID của người dùng
      onlineUsers.set(userId, socket.id);
      // Emit online cho mọi người dùng
      io.emit(`online:${userId}`, { userId, isOnline: true });
      console.log(`User ${userId} is online`);

      socket.emit("online_users", Array.from(onlineUsers.keys()));
      if (
        socket.handshake.query &&
        socket.handshake.query.currentConversation
      ) {
        const conversationId = socket.handshake.query.currentConversation;
        socket.join(conversationId);
      }

      // Thông báo cho tất cả người dùng khác rằng người dùng này đã online
      socket.broadcast.emit("user_connected", userId);
    });

    // Xử lý khi người dùng ngắt kết nối
    socket.on("disconnect", () => {
      let disconnectedUserId = null;

      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        console.log(`User ${disconnectedUserId} disconnected`);
        io.emit(`offline:${disconnectedUserId}`, {
          userId: disconnectedUserId,
          isOnline: false,
        });
        console.log(`User ${disconnectedUserId} is offline`);

        onlineUsers.delete(disconnectedUserId);
        userEncryptionKeys.delete(disconnectedUserId);
        socket.broadcast.emit("user_disconnected", disconnectedUserId);
      }
    });

    // Xử lý khi người dùng tham gia vào cuộc trò chuyện
    socket.on("join_conversation", (data) => {
      if (!data.conversationId || !data.userId) {
        console.error("Invalid join_conversation data:", data);
        return;
      }

      console.log(
        `User ${data.userId} joining conversation: ${data.conversationId}`
      );

      // Rời khỏi tất cả các phòng khác (trừ phòng mặc định là socket.id)
      const rooms = [...socket.rooms];
      rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      // Join vào phòng mới
      socket.join(data.conversationId);

      console.log(
        `User ${data.userId} joined conversation: ${data.conversationId}`
      );
    });

    // Xử lý khi có tin nhắn mới (với mã hóa)
    socket.on("send_message", async (messageData) => {
      try {
        if (!messageData || !messageData.receiverId || !messageData.senderId) {
          console.error("Invalid message data:", messageData);
          return;
        }
        console.log("Received message data:", messageData);

        // Tạo bản sao của dữ liệu tin nhắn và loại bỏ _id (nếu có)
        const { _id, ...messageDataWithoutId } = messageData;

        // Lấy socket ID của người nhận
        const receiverSocketId = onlineUsers.get(messageData.receiverId);

        if (receiverSocketId) {
          // Gửi tin nhắn đến người nhận
          io.to(receiverSocketId).emit(`message:${messageData.receiverId}`, {
            message: messageData,
            conversation: messageData.conversationId,
            type: "new_message",
          });

          if (messageData._id) {
            await Message.findByIdAndUpdate(messageData._id, {
              status: "delivered",
            });

            // Thông báo cho người gửi rằng tin nhắn đã được gửi thành công
            socket.emit("message_status", {
              messageId: messageData._id,
              status: "delivered",
            });
          }
        }
      } catch (error) {
        console.error("Error handling new message:", error);
      }
    });

    // Xử lý khi tin nhắn được đọc
    socket.on("mark_read", async ({ conversationId, userId }) => {
      try {
        if (!conversationId || !userId) {
          console.error("Invalid mark_read data:", { conversationId, userId });
          return;
        }

        // Tìm cuộc trò chuyện
        const conversation = await Conversation.findById(
          conversationId
        ).populate("participants");

        if (!conversation) {
          console.error(`Conversation ${conversationId} not found`);
          return;
        }

        // Tìm người gửi tin nhắn (không phải người đánh dấu đã đọc)
        const sender = conversation.participants.find(
          (participant) => participant._id.toString() !== userId
        );

        if (!sender) {
          console.error(`Sender not found in conversation ${conversationId}`);
          return;
        }

        // Lấy socket ID của người gửi tin nhắn
        const senderSocketId = onlineUsers.get(sender._id.toString());

        if (senderSocketId) {
          // Gửi thông báo đã đọc đến người gửi
          io.to(senderSocketId).emit(`message_read:${sender._id.toString()}`, {
            conversationId,
            readBy: userId,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error handling mark as read:", error);
      }
    });

    socket.on("typing", function (data) {
      // Broadcast to other users in the conversation
      socket.to(data.conversationId).emit("typing", data);
    });

    socket.on("stop_typing", function (data) {
      // Broadcast to other users in the conversation
      socket.to(data.conversationId).emit("stop_typing", data);
    });

    // Xử lý sự kiện tự động đánh dấu tin nhắn đã đọc khi đang xem cuộc trò chuyện
    socket.on("auto_read", async (data) => {
      const { conversationId, userId, otherUserId, readAt } = data;

      if (!conversationId || !userId || !otherUserId) return;

      try {
        // Cập nhật trạng thái đã đọc trong cơ sở dữ liệu
        await Message.updateMany(
          {
            conversationId,
            senderId: otherUserId,
            status: { $ne: "read" },
          },
          { $set: { status: "read", readAt: readAt || new Date() } }
        );

        // Gửi thông báo đã đọc đến người gửi nếu họ đang online
        if (onlineUsers.has(otherUserId)) {
          io.to(onlineUsers.get(otherUserId)).emit(
            `message_read:${otherUserId}`,
            {
              type: "messages_read",
              conversationId,
              readBy: userId,
              readAt: readAt || new Date(),
            }
          );
        }
      } catch (error) {
        console.error("Error auto-marking messages as read:", error);
      }
    });
    // Kiểm tra trạng thái online của người dùng (bao gồm người bán)
    socket.on("check_seller_status", ({ sellerId }, callback) => {
      if (callback && typeof callback === "function") {
        callback({
          sellerId,
          isOnline: onlineUsers.has(sellerId),
        });
      }
    });
  });

  return io;
}

module.exports = initSocketServer;
