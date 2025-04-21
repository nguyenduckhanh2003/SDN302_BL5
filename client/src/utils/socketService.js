// socketService.js
import { io } from "socket.io-client";

let socket;
let socketInitCount = 0; // Biến đếm số lần khởi tạo

// Khởi tạo kết nối socket
export const initSocket = (userId,currentConversation = null) => {

  if (socket && socket.connected) {
    return socket;
  }
  let query = { userId };
  // Thêm currentConversation vào query nếu có
  if (currentConversation) {
    query.currentConversation = currentConversation;
  }
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  socket = io(API_URL, {
    withCredentials: true,
    transports: ["websocket"],
    query: query,
  });

  socket.on("connect", () => {
    console.log("Kết nối socket thành công:", socket.id);

    // Đăng ký người dùng với socket server
    socket.emit("user_connect", userId);
  });

  socket.on("connect_error", (error) => {
    console.error("Lỗi kết nối socket:", error);
  });

  socket.on("disconnect", () => {
    console.log("Ngắt kết nối socket");
  });

  return socket;
};

// Thêm hàm này vào socketService.js
export const joinConversation = (conversationId, userId) => {
  if (!socket) {
    console.error("Socket chưa được khởi tạo trong joinConversation");
    return;
  }
  
  console.log(`Yêu cầu join vào conversation: ${conversationId}`);
  
  socket.emit('join_conversation', {
    conversationId,
    userId
  });
};

// Lấy instance socket hiện tại
export const getSocket = () => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return null;
  }
  return socket;
};

// Ngắt kết nối socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Đăng ký lắng nghe tin nhắn mới
export const subscribeToMessages = (userId, callback) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return () => {};
  }
  // Trước tiên, hủy bỏ bất kỳ đăng ký trước đó
  socket.off(`message:${userId}`);

  // Đăng ký kênh tin nhắn cá nhân
  socket.on(`message:${userId}`, callback);

  // Trả về hàm cleanup
  return () => {
    socket.off(`message:${userId}`, callback);
  };
};

// Đăng ký lắng nghe trạng thái đã đọc
export const subscribeToReadReceipts = (userId, callback) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return () => {};
  }

  socket.on(`message_read:${userId}`, callback);

  return () => {
    socket.off(`message_read:${userId}`, callback);
  };
};

// Đăng ký lắng nghe typing status
export const subscribeToTypingStatus = (userId, callback) => {
  if (!socket) {
    console.error("Socket không được khởi tạo trong subscribeToTypingStatus");
    return () => {};
  }
  
  console.log("Đăng ký lắng nghe typing status cho user:", userId);
  
  // Đăng ký xử lý sự kiện typing
  const handleTyping = (data) => {
    console.log("Nhận được sự kiện typing raw:", data); // Thêm log này
    data.isTyping = true;
    callback(data);
  };
  
  // Đăng ký xử lý sự kiện stop_typing
  const handleStopTyping = (data) => {
    console.log("Nhận được sự kiện stop_typing raw:", data); // Thêm log này
    data.isTyping = false;
    callback(data);
  };
  
  // Gắn các hàm xử lý vào sự kiện
  socket.on('typing', handleTyping);
  socket.on('stop_typing', handleStopTyping);
  
  return () => {
    socket.off('typing', handleTyping);
    socket.off('stop_typing', handleStopTyping);
  };
};

// Gửi trạng thái typing
export const sendTypingStatus = (conversationId, userId, isTyping) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return;
  }

  if (isTyping) {
    socket.emit("typing", { conversationId, userId });
  } else {
    socket.emit("stop_typing", { conversationId, userId });
  }
};

// Gửi tin nhắn
export const sendMessage = (messageData) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return;
  }

  socket.emit("send_message", messageData);
};

// Đánh dấu tin nhắn đã đọc
export const markMessagesAsRead = (conversationId, userId) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return;
  }

  socket.emit("mark_read", { conversationId, userId });
};

// Kiểm tra trạng thái của người bán
export const checkSellerStatus = (sellerId, callback) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");

    // Tự động thực hiện callback với trạng thái mặc định nếu socket chưa được khởi tạo
    if (callback && typeof callback === "function") {
      callback({ isOnline: true }); // Mặc định coi như online
    }
    return;
  }

  socket.emit("check_seller_status", { sellerId }, (status) => {
    if (callback && typeof callback === "function") {
      callback(status || { isOnline: true }); // Mặc định online nếu không nhận được phản hồi
    }
  });
};

// Đăng ký lắng nghe trạng thái online của người bán
export const subscribeToSellerStatus = (sellerId, callback) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return () => {};
  }

  // Đăng ký sự kiện online/offline
  socket.on(`seller_online:${sellerId}`, () => {
    callback({ sellerId, isOnline: true });
  });

  socket.on(`seller_offline:${sellerId}`, () => {
    callback({ sellerId, isOnline: false });
  });

  // Kiểm tra trạng thái ban đầu
  checkSellerStatus(sellerId, callback);

  return () => {
    socket.off(`seller_online:${sellerId}`);
    socket.off(`seller_offline:${sellerId}`);
  };
};

// Thực hiện đánh dấu đã đọc khi nhận tin nhắn mới và đang mở cuộc trò chuyện đó
export const autoMarkAsRead = (conversationId, userId, otherUserId) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return;
  }

  // Gửi thông báo đã đọc đến người gửi
  socket.emit("auto_read", {
    conversationId,
    userId,
    otherUserId,
    readAt: new Date().toISOString(),
  });
};
