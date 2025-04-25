const crypto = require("crypto");

// Tạo khóa ngẫu nhiên cho phiên làm việc
function generateSessionKey() {
  return crypto.randomBytes(32).toString("hex");
}

// Mã hóa tin nhắn sử dụng AES-256-GCM
function encryptMessage(message, key) {
  console.log("Bắt đầu mã hóa tin nhắn:", message);
  console.log("Có khóa phiên:", sessionKey ? "Có" : "Không");

  if (!sessionKey) {
    console.warn("Chưa có khóa phiên. Tin nhắn không được mã hóa.");
    return message;
  }
  try {
    // Tạo vector khởi tạo (IV) ngẫu nhiên
    const iv = crypto.randomBytes(16);

    // Tạo cipher với AES-256-GCM
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      iv
    );

    // Mã hóa tin nhắn
    let encrypted = cipher.update(JSON.stringify(message), "utf8", "hex");
    encrypted += cipher.final("hex");
    console.log("Mã hóa thành công, kết quả:", encrypted);
    // Lấy authentication tag để kiểm tra tính toàn vẹn
    const authTag = cipher.getAuthTag().toString("hex");

    // Trả về đối tượng chứa dữ liệu đã mã hóa và thông tin để giải mã
    return {
      encrypted: true,
      iv: iv.toString("hex"),
      content: encrypted,
      authTag: authTag,
    };
  } catch (error) {
    console.error("Lỗi khi mã hóa tin nhắn:", error);
    return message; // Trả về tin nhắn gốc nếu có lỗi
  }
}

// Giải mã tin nhắn
function decryptMessage(encryptedData, key) {
  try {
    // Tạo decipher
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      Buffer.from(encryptedData.iv, "hex")
    );

    // Thiết lập authentication tag
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    // Giải mã
    let decrypted = decipher.update(encryptedData.content, "hex", "utf8");
    decrypted += decipher.final("utf8");

    // Trả về đối tượng đã giải mã
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Lỗi khi giải mã tin nhắn:", error);
    return null;
  }
}

module.exports = {
  generateSessionKey,
  encryptMessage,
  decryptMessage,
};
