import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Smile, Image, X } from "lucide-react";
import { sendChatToSeller } from "../../apis/chat/chat";
import EmojiPicker from "emoji-picker-react";
import { formatMessageTime } from "../../utils/formatTime";
import { getSocket, sendMessage, sendTypingStatus } from "../../utils/socketService";
import { useSelector } from "react-redux";

const MessageInput = ({
  conversationId,
  sellerId,
  onMessageSent,
  disabled = false,
  setMessages,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  // Lưu vị trí con trỏ mỗi khi input có focus hoặc khi text thay đổi
  const trackCursorPosition = () => {
    if (textInputRef.current) {
      setCursorPosition(textInputRef.current.selectionStart);
    }
  };

  // Xử lý typing indicator
  const handleTyping = () => {
    if (!conversationId) return;

    // Gửi trạng thái typing
    sendTypingStatus(conversationId, user._id, true);

    // Hủy timeout hiện tại nếu có
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Tạo timeout mới - sau 3 giây không gõ sẽ gửi stop_typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(conversationId, user._id, false);
    }, 3000);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutsideEmoji = (event) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutsideEmoji);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideEmoji);
    };
  }, [showEmojiPicker]);

  const handleSendMessage = async () => {
    if (
      (!inputValue.trim() && selectedImages.length === 0) ||
      !conversationId ||
      disabled
    )
      return;

    try {
      setIsUploading(true);

      // Reset typing status
      setIsTyping(false);
      sendTypingStatus(conversationId, sellerId, false);

      // Create optimistic message for text
      if (inputValue.trim()) {
        const optimisticTextMessage = {
          id: `temp-text-${Date.now()}`,
          sender: "me",
          content: inputValue,
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isRead: false,
          status: "sending",
          sending: true,
          temporary: true,
        };
        onMessageSent(optimisticTextMessage);
      }

      // Create optimistic messages for images (if any)
      if (selectedImages.length > 0) {
        const optimisticImageMessage = {
          id: `temp-image-${Date.now()}-${Math.random()}`,
          sender: "me",
          content: "",
          images: selectedImages.map((image) => image.preview),
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isRead: false,
          status: "sending",
          sending: true,
          temporary: true,
        };
        onMessageSent(optimisticImageMessage);
      }

      // Clear input state
      setInputValue("");
      setSelectedImages([]);
      setShowEmojiPicker(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }

      const response = await sendChatToSeller(
        inputValue,
        selectedImages,
        conversationId,
        sellerId
      );

      if (response.success) {
        setUploadProgress(100); // Set progress to 100% on success
        response.data.messages.forEach((msg) => {
          // Gửi thông báo socket cho người nhận
          sendMessage({
            ...msg,
            conversationId: conversationId,
            receiverId: sellerId,
          });
        });
        setMessages((prevMessages) => {
          // Filter out temporary messages
          const filteredMessages = prevMessages.filter((msg) => !msg.temporary);

          // Format server messages
          const serverMessages = response.data.messages.map((msg) => ({
            id: msg._id,
            sender: "me",
            text: msg.content || "",
            images: msg.imagesUrl ? msg.imagesUrl : [],
            time: formatMessageTime(new Date(msg.createdAt || Date.now())),
            status: msg.status || "sent",
          }));

          return [...filteredMessages, ...serverMessages];
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // You could add error handling here (show a notification etc.)
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setShowEmojiPicker(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    if (selectedImages.length + files.length > 5) {
      // Hiển thị thông báo lỗi
      setError("Bạn chỉ được đăng tối đa 5 ảnh trong một tin nhắn");

      // Tự động ẩn thông báo lỗi sau 3 giây
      setTimeout(() => {
        setError(null);
      }, 3000);

      return; // Không tiếp tục xử lý
    }
    // Kiểm tra kích thước file (giới hạn 5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = newFiles.filter((file) => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      // Có file vượt quá kích thước cho phép
      setError(
        `Kích thước file không được vượt quá 5MB. ${oversizedFiles.length} file vượt giới hạn.`
      );
      setTimeout(() => setError(null), 3000);

      // Nếu có các file hợp lệ, vẫn tiếp tục xử lý với các file đó
      const validFiles = newFiles.filter((file) => file.size <= maxSize);
      if (validFiles.length === 0) return;

      // Xử lý các file hợp lệ
      const newImages = validFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setSelectedImages([...selectedImages, ...newImages]);
      return;
    }
    // Xử lý mỗi file và tạo preview trong cùng một luồng
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target.result;
        // Thêm cả file và preview vào cùng một object
        setSelectedImages((prev) => [...prev, { file, preview }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Emoji handling - đã sửa để giữ cho emoji picker mở và vị trí con trỏ đúng
  const handleEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    const input = textInputRef.current;
    if (!input) return;

    const start = cursorPosition;
    const before = inputValue.slice(0, start);
    const after = inputValue.slice(start);

    const newValue = before + emoji + after;
    setInputValue(newValue);

    // Cập nhật lại vị trí con trỏ
    const newCursorPos = start + emoji.length;

    // Sử dụng setTimeout để đảm bảo việc cập nhật con trỏ diễn ra sau khi component render lại
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
      setCursorPosition(newCursorPos);
    }, 0);
  };

  const removePreview = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  return (
    <div className="p-3 border-t border-gray-200 bg-white">
      {selectedImages.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 max-h-[200px] overflow-auto rounded-lg justify-start items-center">
          {selectedImages.map((image, index) => (
            <div key={index} className="relative max-w-[30%]">
              <img
                src={image.preview}
                alt={`Preview ${index}`}
                className="max-w-full h-auto rounded-lg"
              />
              {/* Hiển thị kích thước file */}
              <span className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                {(image.file.size / (1024 * 1024)).toFixed(2)}MB
              </span>
              <button
                onClick={() => removePreview(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Đang tải lên: {uploadProgress}%
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 relative">
        <div className="flex-1 relative">
          {error && (
            <div className="absolute -top-12 left-0 right-0 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Nhập nội dung tin nhắn"
            className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              trackCursorPosition();
              // Gửi trạng thái typing
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            onKeyUp={trackCursorPosition}
            onMouseUp={trackCursorPosition}
            onFocus={trackCursorPosition}
            onBlur={trackCursorPosition}
            disabled={disabled || isUploading}
            ref={textInputRef}
          />
          <div className="absolute right-2 top-[30%] flex items-center gap-2 text-gray-400">
            <div className="relative">
              <Smile
                size={20}
                className="cursor-pointer"
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              />
              {showEmojiPicker && (
                <div
                  className="absolute bottom-10 right-0 z-10"
                  ref={emojiPickerRef}
                >
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
            <div onClick={triggerFileUpload} className="cursor-pointer">
              <Image size={20} />
            </div>
          </div>
        </div>
        <button
          onClick={handleSendMessage}
          disabled={
            (!inputValue.trim() && selectedImages.length === 0) ||
            disabled ||
            isUploading
          }
          className={`text-white w-10 h-10 rounded-full flex items-center justify-center ${
            (!inputValue.trim() && selectedImages.length === 0) ||
            disabled ||
            isUploading
              ? "bg-green-300 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send size={18} />
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>
    </div>
  );
};

export default MessageInput;
