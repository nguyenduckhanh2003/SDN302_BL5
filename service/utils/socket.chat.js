// socketServer.js
const { Server } = require("socket.io");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*", // Cho phép tất cả origins trong development
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // Hỗ trợ cả WebSocket và HTTP long-polling
  });

  // Map để lưu trữ thông tin người dùng đang online
  const onlineUsers = new Map();

  // Xử lý khi có client kết nối đến
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Xử lý khi người dùng đăng nhập và kết nối
    socket.on("user_connect", (userId) => {
      if (!userId) return;

      console.log(`User ${userId} connected with socket ${socket.id}`);

      // Lưu thông tin socket ID của người dùng
      onlineUsers.set(userId, socket.id);

      // Thông báo cho người dùng này về danh sách người dùng đang online
      socket.emit("online_users", Array.from(onlineUsers.keys()));
      if (socket.handshake.query.currentConversation) {
        console.log(
          `User ${userId} auto-joining conversation: ${conversationId}`
        );
        socket.join(socket.handshake.query.currentConversation);
      }
      // Thông báo cho tất cả người dùng khác rằng người dùng này đã online
      socket.broadcast.emit("user_connected", userId);
    });

    // Xử lý khi người dùng ngắt kết nối
    socket.on("disconnect", () => {
      let disconnectedUserId = null;

      // Tìm userId dựa vào socket.id
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        console.log(`User ${disconnectedUserId} disconnected`);

        // Xóa người dùng khỏi danh sách online
        onlineUsers.delete(disconnectedUserId);

        // Thông báo cho tất cả người dùng khác rằng người dùng này đã offline
        socket.broadcast.emit("user_disconnected", disconnectedUserId);
      }
    });
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
    // Xử lý khi có tin nhắn mới
    socket.on("send_message", async (messageData) => {
      try {
        if (!messageData || !messageData.receiverId) {
          console.error("Invalid message data:", messageData);
          return;
        }
        // Lấy socket ID của người nhận
        const receiverSocketId = onlineUsers.get(messageData.receiverId);

        if (receiverSocketId) {
          // Gửi tin nhắn đến người nhận nếu họ đang online
          io.to(receiverSocketId).emit(`message:${messageData.receiverId}`, {
            message: messageData,
            conversation: messageData.conversationId,
            type: "new_message",
          });

          // Cập nhật trạng thái tin nhắn thành "delivered" nếu người nhận online
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
    // Kiểm tra trạng thái online của người dùng
    socket.on("check_user_status", (data, callback) => {
      const { userId } = data;

      if (callback && typeof callback === "function") {
        callback({
          userId,
          isOnline: onlineUsers.has(userId),
        });
      }
    });
  });

  return io;
}

module.exports = initSocketServer;
