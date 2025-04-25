// socketService.js
import { io } from "socket.io-client";
import CryptoJS from "crypto-js";
// Biến lưu trữ khóa phiên
let sessionKey = null;
let socket;
let socketInitCount = 0;
// Khởi tạo kết nối socket

const encryptWithSecretKey = async (text) => {
  // Fetch the secret key from environment variables
  const secretKey = process.env.REACT_APP_PUBLIC_SECRET_KEY?.replace(/\\n/g, "\n");

  // Generate a random Initialization Vector (IV) for security
  const iv = CryptoJS.lib.WordArray.random(16);

  // Encrypt the text using AES with CBC mode and the secret key
  const encrypted = CryptoJS.AES.encrypt(
    text,
    CryptoJS.enc.Hex.parse(secretKey),
    {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC,
    }
  );

  // Concatenate IV and ciphertext and encode in Base64 format
  const encryptedBase64 = CryptoJS.enc.Base64.stringify(
    iv.concat(encrypted.ciphertext)
  );

  return encryptedBase64;
};
// Hàm giải mã tin nhắn phía client
const decryptWithSecretKey = (encryptedText) => {
  try {
    const fullCipher = CryptoJS.enc.Base64.parse(encryptedText);

    // Extract IV and ciphertext from the parsed cipher
    const iv = CryptoJS.lib.WordArray.create(fullCipher.words.slice(0, 4), 16);
    const ciphertext = CryptoJS.lib.WordArray.create(fullCipher.words.slice(4));

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertext,
    });

    // Fetch and parse the secret key from environment variables
    const secretKey = process.env.REACT_APP_PUBLIC_SECRET_KEY ?.replace(
      /\\n/g,
      "\n"
    );

    // Decrypt the ciphertext using AES and the provided secret key
    const decrypted = CryptoJS.AES.decrypt(
      cipherParams,
      CryptoJS.enc.Hex.parse(secretKey),
      {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      }
    );

    // Return decrypted text in UTF-8 format
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption error:", error);
    return;
  }
};

export const initSocket = (user, currentConversation = null) => {
  const { role } = user || {};
  const userId = user._id;
  if (socket && socket.connected) {
    return socket;
  }
  let query = { userId };
  // Thêm currentConversation vào query nếu có
  if (currentConversation) {
    query.currentConversation = currentConversation;
  }

  // Đảm bảo kết nối đến HTTPS
  const API_URL = (
    process.env.REACT_APP_API_URL || "https://localhost:8443"
  ).replace(/^http:/, "https:");

  socket = io(API_URL, {
    withCredentials: true,
    transports: ["websocket"],
    secure: true, // Đảm bảo sử dụng SSL
    query: query,
  });

  socket.on("connect", () => {
    console.log("Kết nối socket thành công:", socket.id);

    // Thiết lập kênh bảo mật trước khi đăng ký người dùng
    socket.emit("establish_secure_channel", userId);

    // Lắng nghe sự kiện thiết lập kênh bảo mật thành công
    socket.on("secure_channel_established", (data) => {
      sessionKey = data.sessionKey;
      // Đăng ký người dùng sau khi thiết lập bảo mật
      socket.emit("user_connect", userId);
    });
  });

  socket.on("connect_error", (error) => {
    console.error("Lỗi kết nối socket:", error);
  });

  socket.on("disconnect", () => {
    console.log("Ngắt kết nối socket");
    sessionKey = null; // Xóa khóa phiên khi ngắt kết nối
  });

  return socket;
};

// Cập nhật hàm subscribeToMessages để hỗ trợ giải mã
export const subscribeToMessages = async (userId, callback) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return () => {};
  }

  // Trước tiên, hủy bỏ bất kỳ đăng ký trước đó
  socket.off(`message:${userId}`);

  // Đăng ký kênh tin nhắn cá nhân với hỗ trợ giải mã
  socket.on(`message:${userId}`, (data) => {
    
    if (data.message && data.message.encrypted) {
      try {
        const decryptedContent = decryptWithSecretKey(data.message.content);
        // Cập nhật nội dung tin nhắn với kết quả giải mã
        data.message.content = decryptedContent;
      } catch (error) {
        console.error("Lỗi xử lý tin nhắn mã hóa:", error);
      }
    }
    
    callback(data);
  });
  // Trả về hàm cleanup
  return () => {
    socket.off(`message:${userId}`, callback);
  };
};

// Cập nhật hàm sendMessage để hỗ trợ mã hóa
export const sendMessage = async(messageData) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return;
  }

  // Mã hóa nội dung tin nhắn nếu có khóa phiên
  let secureMessage = { ...messageData };

  if (sessionKey && messageData.content) {
    // Trong thực tế, bạn có thể chỉ muốn mã hóa phần nội dung của tin nhắn
    const encryptedData = await encryptWithSecretKey(messageData.content);
    secureMessage.content = encryptedData;
    secureMessage.encrypted = true;
    // Quá trình mã hóa...
  }
  // Gửi tin nhắn đã mã hóa
  socket.emit("send_message", secureMessage);
};

// Các hàm khác giữ nguyên
export const joinConversation = (conversationId, userId) => {
  if (!socket) {
    console.error("Socket chưa được khởi tạo trong joinConversation");
    return;
  }

  console.log(`Yêu cầu join vào conversation: ${conversationId}`);

  socket.emit("join_conversation", {
    conversationId,
    userId,
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
    sessionKey = null; // Đảm bảo xóa khóa phiên khi ngắt kết nối
  }
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
  socket.on("typing", handleTyping);
  socket.on("stop_typing", handleStopTyping);

  return () => {
    socket.off("typing", handleTyping);
    socket.off("stop_typing", handleStopTyping);
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

// Đánh dấu tin nhắn đã đọc
export const markMessagesAsRead = (conversationId, userId) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Vui lòng gọi initSocket trước.");
    return;
  }

  socket.emit("mark_read", { conversationId, userId });
};

// Kiểm tra trạng thái của người bán
export const checkUserStatus = (userId, callback) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo.");
    if (callback && typeof callback === "function") {
      callback({ isOnline: false });
    }
    return;
  }
  socket.emit("check_user_status", { userId }, (status) => {
    if (callback && typeof callback === "function") {
      callback(status || { isOnline: false });
    }
  });
};

export const subscribeToUserStatus = (userId, callback) => {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo.");
    callback({ userId, isOnline: false });
    return () => {};
  }

  socket.on(`online:${userId}`, (data) => {
    console.log(`Nhận online:${userId}`, data);
    callback({ userId, isOnline: true });
  });

  socket.on(`offline:${userId}`, (data) => {
    console.log(`Nhận offline:${userId}`, data);
    callback({ userId, isOnline: false });
  });

  console.log(`Đăng ký check_user_status cho ${userId}`);
  socket.emit("check_user_status", { userId }, (status) => {
    console.log(`Trạng thái ban đầu user ${userId}:`, status);
    callback(status);
  });

  return () => {
    socket.off(`online:${userId}`);
    socket.off(`offline:${userId}`);
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
