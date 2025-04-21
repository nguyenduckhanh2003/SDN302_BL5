import React, { useState, useRef, useEffect } from "react";
import {
  FiX,
  FiCamera,
  FiInfo,
  FiSmile,
  FiPaperclip,
  FiLoader,
} from "react-icons/fi";
import { Check, X } from "lucide-react";
// Note: You'll need to install emoji-picker-react
// npm install emoji-picker-react
import EmojiPicker from "emoji-picker-react";
import {
  getConversationDetailBuyer,
  sendChatToSellerWithProduct,
} from "../../../apis/chat/chat";
import { useSelector } from "react-redux";
import { renderChatMessages } from "./ChatDetail";
import {
  initSocket,
  subscribeToMessages,
  subscribeToReadReceipts,
  markMessagesAsRead,
  sendTypingStatus,
} from "../../../utils/socketService";
const ContactSellerModal = ({ isOpen, onClose, shoppInfo, product }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorUpload, setErrorUpload] = useState(null);
  const [success, setSuccess] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const messageAreaRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Khởi tạo socket khi component mount nếu user đã đăng nhập
  useEffect(() => {
    if (user?._id && isOpen) {
      const socket = initSocket(user._id);

      // Cleanup khi component unmount
      return () => {
        // Không ngắt kết nối socket khi đóng modal
        // Chỉ hủy các subscription
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [user, isOpen]);

  // Lắng nghe tin nhắn mới và trạng thái đã đọc khi mở modal
  useEffect(() => {
    if (!user?._id || !isOpen || !chatData?.conversation?._id) return;

    const sellerId = shoppInfo?.seller;
    const conversationId = chatData.conversation._id;

    // Đăng ký lắng nghe tin nhắn mới
    const unsubscribeMessages = subscribeToMessages(user._id, (data) => {
      if (data.conversation === conversationId) {
        // Cập nhật UI với tin nhắn mới
        handleNewMessageReceived(data.message);
      }
    });

    // Đăng ký lắng nghe trạng thái đã đọc
    const unsubscribeReadReceipts = subscribeToReadReceipts(
      user._id,
      (data) => {
        if (data.conversationId === conversationId) {
          // Cập nhật UI với trạng thái đã đọc
          updateMessageStatus(data.readBy);
        }
      }
    );

    // Cleanup khi component unmount hoặc khi đóng modal
    return () => {
      unsubscribeMessages();
      unsubscribeReadReceipts();
    };
  }, [user, isOpen, chatData]);

  // Xử lý khi nhận được tin nhắn mới từ socket
  const handleNewMessageReceived = (newMessage) => {
    if (!chatData) return;

    // Xác định ngày của tin nhắn
    const msgDate = new Date(newMessage.timestamp || newMessage.createdAt);
    const today = new Date();
    const isToday = isSameDay(msgDate, today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = isSameDay(msgDate, yesterday);

    // Định dạng tin nhắn
    const formattedMessage = {
      _id: newMessage._id,
      senderId:
        typeof newMessage.senderId === "object"
          ? newMessage.senderId
          : { _id: newMessage.senderId },
      receiverId: newMessage.receiverId,
      content: newMessage.content || "",
      imagesUrl: newMessage.imagesUrl || null,
      status: newMessage.status || "sent",
      timestamp: newMessage.timestamp || newMessage.createdAt,
      createdAt: newMessage.createdAt || newMessage.timestamp,
      updatedAt: newMessage.updatedAt || newMessage.timestamp,
      productRef: newMessage.productRef || null,
    };

    // Tạo bản sao mới của chatData để cập nhật
    const updatedChatData = { ...chatData };

    // Thêm tin nhắn vào danh sách tin nhắn
    updatedChatData.messages = [...updatedChatData.messages, formattedMessage];

    // Tìm nhóm tin nhắn theo ngày phù hợp hoặc tạo mới
    let targetGroup = null;

    if (isToday) {
      targetGroup = updatedChatData.messagesByDate.find(
        (group) => group.displayText === "Hôm nay"
      );
      if (!targetGroup) {
        targetGroup = {
          date: today.toLocaleDateString("vi-VN"),
          displayText: "Hôm nay",
          messages: [],
        };
        updatedChatData.messagesByDate.push(targetGroup);
      }
    } else if (isYesterday) {
      targetGroup = updatedChatData.messagesByDate.find(
        (group) => group.displayText === "Hôm qua"
      );
      if (!targetGroup) {
        targetGroup = {
          date: yesterday.toLocaleDateString("vi-VN"),
          displayText: "Hôm qua",
          messages: [],
        };
        updatedChatData.messagesByDate.push(targetGroup);
      }
    } else {
      // Tìm hoặc tạo nhóm cho ngày khác
      const dateString = msgDate.toLocaleDateString("vi-VN");
      targetGroup = updatedChatData.messagesByDate.find(
        (group) => group.date === dateString
      );
      if (!targetGroup) {
        targetGroup = {
          date: dateString,
          displayText: dateString,
          messages: [],
        };
        updatedChatData.messagesByDate.push(targetGroup);
      }
    }

    // Thêm tin nhắn vào nhóm
    targetGroup.messages.push(formattedMessage);

    // Cập nhật lastMessage trong conversation
    if (updatedChatData.conversation) {
      updatedChatData.conversation.lastMessage = {
        _id: formattedMessage._id,
        senderId:
          typeof formattedMessage.senderId === "object"
            ? formattedMessage.senderId._id
            : formattedMessage.senderId,
        content: formattedMessage.content || "",
        status: formattedMessage.status,
        timestamp: formattedMessage.timestamp,
      };
    }

    // Cập nhật state
    setChatData(updatedChatData);

    // Đánh dấu tin nhắn đã đọc nếu người nhận là người dùng hiện tại
    if (formattedMessage.senderId._id !== user._id) {
      markAsRead();
    }

    // Cuộn xuống cuối cùng
    setTimeout(() => {
      if (messageAreaRef.current) {
        messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
      }
    }, 100);
  };

  // Cập nhật trạng thái tin nhắn khi nhận được thông báo đã đọc
  const updateMessageStatus = (readById) => {
    if (!chatData) return;

    // Tạo bản sao mới của chatData để cập nhật
    const updatedChatData = { ...chatData };

    // Cập nhật trạng thái trong danh sách messages
    updatedChatData.messages = updatedChatData.messages.map((msg) =>
      msg.senderId._id === user._id ? { ...msg, status: "read" } : msg
    );

    // Cập nhật trạng thái trong messagesByDate
    updatedChatData.messagesByDate = updatedChatData.messagesByDate.map(
      (group) => ({
        ...group,
        messages: group.messages.map((msg) =>
          msg.senderId._id === user._id ? { ...msg, status: "read" } : msg
        ),
      })
    );

    // Cập nhật state
    setChatData(updatedChatData);
  };

  // Đánh dấu tin nhắn đã đọc
  const markAsRead = () => {
    if (!chatData?.conversation?._id) return;

    markMessagesAsRead(chatData.conversation._id, user._id);
  };

  // Xử lý typing indicator
  const handleTyping = () => {
    if (!chatData?.conversation?._id) return;

    // Gửi trạng thái typing
    sendTypingStatus(chatData.conversation._id, user._id, true);

    // Hủy timeout hiện tại nếu có
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Tạo timeout mới - sau 3 giây không gõ sẽ gửi stop_typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(chatData?.conversation._id, user._id, false);
    }, 3000);
  };

  // Lấy lịch sử trò chuyện khi mở modal
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!shoppInfo?.seller) return;

      try {
        setLoading(true);
        const response = await getConversationDetailBuyer(shoppInfo.seller);
        if (response.success) {
          setChatData(response.data);
        }
      } catch (err) {
        console.error("Error fetching chat history:", err);
        // setError("Failed to load chat history. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchChatHistory();
    }
  }, [isOpen, shoppInfo]);

  const handleImageUpload = (e) => {
    try {
      const files = Array.from(e.target.files);

      // Log để debug
      console.log("Files nhận vào:", files);
      console.log("File đầu tiên:", files[0]);

      // Kiểm tra số lượng ảnh
      if (selectedImages.length + files.length > 5) {
        setErrorUpload("Bạn chỉ được đăng tối đa 5 ảnh trong một tin nhắn");
        setTimeout(() => setErrorUpload(null), 3000);
        return;
      }

      // Kiểm tra kích thước file với kiểm tra null/undefined
      const maxSize = 5 * 1024 * 1024; // 5MB
      const oversizedFiles = files.filter(
        (file) => file && typeof file?.size === "number" && file?.size > maxSize
      );

      if (oversizedFiles.length > 0) {
        setErrorUpload(
          `Kích thước file không được vượt quá 5MB. ${oversizedFiles.length} file vượt giới hạn.`
        );
        setTimeout(() => setErrorUpload(null), 3000);

        // Lọc các file hợp lệ
        const validFiles = files.filter(
          (file) =>
            file && typeof file.size === "number" && file.size <= maxSize
        );
        console.log(validFiles);
        if (validFiles.length === 0) return;

        // Tạo bản sao an toàn của selectedImages
        const currentSelectedImages = [...selectedImages];

        // Tạo bản sao an toàn của previewImages
        const currentPreviewImages = [...previewImages];

        // Thêm file mới vào
        validFiles.forEach((file) => {
          currentSelectedImages.push(file);
          currentPreviewImages.push({
            url: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
          });
        });

        // Cập nhật state
        setSelectedImages(currentSelectedImages);
        setPreviewImages(currentPreviewImages);
        return;
      }

      if (files.length > 0) {
        // Tạo bản sao an toàn của các mảng
        const currentSelectedImages = [...selectedImages];
        const currentPreviewImages = [...previewImages];

        // Thêm file mới vào
        files.forEach((file) => {
          if (file) {
            currentSelectedImages.push(file);
            currentPreviewImages.push({
              url: URL.createObjectURL(file),
              name: file.name,
              size: file.size,
            });
          }
        });

        // Cập nhật state
        setSelectedImages(currentSelectedImages);
        setPreviewImages(currentPreviewImages);
      }
    } catch (error) {
      console.error("Lỗi trong handleImageUpload:", error);
      setErrorUpload("Đã xảy ra lỗi khi tải ảnh lên. Vui lòng thử lại.");
      setTimeout(() => setErrorUpload(null), 3000);
    }
  };
  console.log(previewImages);
  const removeImage = (index) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(previewImages[index].url);

    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Cập nhật hàm onEmojiClick để chèn emoji tại vị trí con trỏ
  const onEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);

    // Chèn emoji vào vị trí con trỏ
    const newMessage = textBeforeCursor + emoji + textAfterCursor;
    setMessage(newMessage);

    // Cập nhật vị trí con trỏ sau khi chèn emoji
    const newCursorPosition = cursorPosition + emoji.length;
    setCursorPosition(newCursorPosition);

    // Đặt focus lại vào textarea và đặt con trỏ đúng vị trí sau khi chèn emoji
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      }
    }, 0);
  };
  // Thêm hàm xử lý sự kiện khi con trỏ thay đổi vị trí
  const handleTextareaSelect = (e) => {
    setCursorPosition(e.target.selectionStart);
  };
  // Xử lý khi nội dung textarea thay đổi
  const handleTextareaChange = (e) => {
    setMessage(e.target.value);
    setCursorPosition(e.target.selectionStart);
    // Gửi trạng thái typing
    handleTyping();
  };
  // Scroll to bottom of message area when new messages are added or when chat data is loaded
  useEffect(() => {
    if (chatData && messageAreaRef.current) {
      // Thêm timeout nhỏ để đảm bảo render đã hoàn tất
      const timer = setTimeout(() => {
        if (messageAreaRef.current) {
          // Kiểm tra lại sau timeout
          messageAreaRef.current.scrollTop =
            messageAreaRef.current.scrollHeight;
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [chatData]);

  // Thêm useEffect mới để scroll khi mở modal lần đầu tiên
  useEffect(() => {
    if (isOpen && !loading && messageAreaRef.current) {
      const timer = setTimeout(() => {
        messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
      }, 200); // Thời gian lâu hơn một chút để đảm bảo dữ liệu đã được tải xong

      return () => clearTimeout(timer);
    }
  }, [isOpen, loading]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutsideEmoji = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        event.target.id !== "emoji-button"
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

  // Close modal when escape key is pressed
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  // Clean up preview URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previewImages.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, []);

  // Reset success and error states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  // Kiểm tra nếu ngày là hôm nay
  const isToday = (date) => {
    return isSameDay(date, new Date());
  };

  // Kiểm tra nếu ngày là hôm qua
  const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date, yesterday);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && selectedImages.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);
      // Dừng trạng thái typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        sendTypingStatus(chatData?.conversation._id, user._id, false);
      }
      // Prepare message data for API
      const messageData = {
        message: message.trim(),
        images: selectedImages,
        product: {
          title: product?.title,
          price: product?.price,
          url: product?.url,
        },
      };

      // Tạo dữ liệu tin nhắn mới để cập nhật UI ngay lập tức
      const now = new Date();
      const newMessageData = {
        _id: `temp-${Date.now()}`,
        senderId: {
          _id: user._id,
          fullname: user.fullname,
          avatar: user.avatar,
        },
        receiverId: shoppInfo?.seller,
        content: message.trim(),
        status: "sent",
        conversationId: chatData?.conversation?._id,
        timestamp: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        temporary: true, // Đánh dấu là tin nhắn tạm thời
        productRef: product
          ? {
              productSnapshot: {
                title: product.title,
                price: product.price,
                imageUrl: product.url,
              },
              productId: product._id,
            }
          : null,
      };

      // Nếu có ảnh, chuẩn bị tin nhắn có ảnh
      const newImageMessages = [];
      // Lưu ý: ở đây chúng ta không thể có URL thật cho ảnh vì chưa upload
      // nhưng để hiển thị preview ngay, chúng ta có thể dùng URL tạm thời từ previewImages
      newImageMessages.push({
        _id: `temp-image-${Date.now()}-${Math.random()}`,
        senderId: {
          _id: user._id,
          fullname: user.fullname,
          avatar: user.avatar,
        },
        receiverId: shoppInfo?.seller,
        // content không có vì đây là tin nhắn ảnh
        imagesUrl: previewImages?.map((image) => image.url), // URL tạm thời để hiển thị preview
        status: "sending",
        conversationId: chatData?.conversation?._id,
        timestamp: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        temporary: true, // Đánh dấu là tin nhắn tạm thời
        productRef: product
          ? {
              productSnapshot: {
                title: product.title,
                price: product.price,
                imageUrl: product.url,
              },
              productId: product._id,
            }
          : null,
      });
      console.log(newImageMessages);
      // Cập nhật UI trước khi gọi API
      const newMessage = message.trim() ? newMessageData : null;

      // Tạo một bản sao của chatData để cập nhật
      let updatedChatData = { ...chatData };
      // Nếu chatData hoặc conversation chưa tồn tại, chuẩn bị một cấu trúc cơ bản
      if (!chatData || !chatData.conversation) {
        updatedChatData = {
          messages: [],
          messagesByDate: [],
          conversation: {
            _id: `temp-conv-${Date.now()}`, // ID tạm thời
            participants: [user._id, shoppInfo.seller],
            isActive: true,
          },
        };
      }
      // Tìm nhóm tin nhắn của ngày hôm nay để thêm tin nhắn mới vào
      const todayGroup = updatedChatData.messagesByDate.find(
        (group) => group.displayText === "Hôm nay"
      );

      if (todayGroup) {
        // Nếu đã có nhóm tin nhắn cho ngày hôm nay
        if (newMessage) {
          todayGroup.messages.push(newMessage);
        }

        // Thêm tin nhắn ảnh nếu có
        if (newImageMessages.length > 0) {
          todayGroup.messages.push(...newImageMessages);
        }
      } else {
        // Nếu chưa có nhóm tin nhắn cho ngày hôm nay, tạo mới
        const today = new Date();
        const todayString = today.toLocaleDateString("vi-VN");

        const newTodayGroup = {
          date: todayString,
          displayText: "Hôm nay",
          messages: newMessage
            ? [...(newImageMessages || []), newMessage]
            : [...newImageMessages],
        };

        updatedChatData.messagesByDate.push(newTodayGroup);
      }

      // Cập nhật danh sách tin nhắn chung
      if (newMessage) {
        updatedChatData.messages = [
          ...(updatedChatData.messages || []),
          newMessage,
        ];
      }

      if (newImageMessages.length > 0) {
        updatedChatData.messages = [
          ...(updatedChatData.messages || []),
          ...newImageMessages,
        ];
      }

      // Cập nhật lastMessage trong conversation
      if (
        updatedChatData.conversation &&
        (newMessage || newImageMessages.length > 0)
      ) {
        updatedChatData.conversation.lastMessage = {
          _id: newMessage?._id || newImageMessages[0]?._id,
          senderId: user._id,
          content: newMessage?.content || "",
          status: "sent",
          timestamp: now.toISOString(),
        };
      }

      // Cập nhật state chatData để UI hiển thị ngay lập tức
      setChatData(updatedChatData);

      // Xóa input và preview
      setMessage("");
      setSelectedImages([]);
      setPreviewImages([]);

      // Gọi API để gửi tin nhắn (vẫn giữ phần này vì cần gửi tin nhắn lên server)
      const response = await sendChatToSellerWithProduct(
        product?.storeId?.seller || shoppInfo?.seller,
        product?._id,
        messageData
      );

      if (response.success) {
        // Kiểm tra xem response.data.messages có tồn tại hay không
        if (!response.data.messages || !Array.isArray(response.data.messages)) {
          // Tạo một mảng tin nhắn giả lập nếu không có
          response.data.messages = response.data.messages || [];
        }

        // Thay thế tin nhắn tạm thời bằng tin nhắn thật từ server
        setChatData((prevChatData) => {
          try {
            // Tạo bản sao sâu của chatData hiện tại
            const updatedChatData = JSON.parse(JSON.stringify(prevChatData));

            // 1. Cập nhật mảng messages
            // Lọc bỏ tin nhắn tạm thời - sử dụng cả temporary và _id
            updatedChatData.messages = (updatedChatData.messages || []).filter(
              (msg) => !msg.temporary && !msg._id.startsWith("temp-")
            );
            // Thêm tin nhắn thật từ server và đảm bảo đánh dấu temporary = false
            const serverMessages = response.data.messages.map((msg) => {
              const formattedMsg = {
                ...msg,
                senderId:
                  msg.senderId && typeof msg.senderId === "object"
                    ? msg.senderId
                    : {
                        _id: msg.senderId || user._id,
                        fullname: user.fullname,
                        avatar: user.avatar,
                      },
                receiverId: shoppInfo?.seller,
                content: msg.content || "",
                imageUrl: msg.imagesUrl || "",
                status: "sent", // Đặt rõ status
                temporary: false, // Đặt rõ temporary = false
                conversationId: updatedChatData.conversation?._id,
                timestamp: msg.timestamp || new Date().toISOString(),
                createdAt: msg.createdAt || new Date().toISOString(),
                updatedAt: msg.updatedAt || new Date().toISOString(),
                productRef: msg.productRef || null,
              };
              return formattedMsg;
            });
            // Cập nhật mảng tin nhắn
            updatedChatData.messages = [
              ...(updatedChatData.messages || []),
              ...serverMessages,
            ];

            // Kiểm tra xem messagesByDate có tồn tại không
            if (!updatedChatData.messagesByDate) {
              updatedChatData.messagesByDate = [];
            }

            updatedChatData.messagesByDate = updatedChatData.messagesByDate.map(
              (group) => {
                // Lọc bỏ tin nhắn tạm thời
                const filteredMessages = group.messages.filter(
                  (msg) => !msg.temporary && !msg._id.startsWith("temp-")
                );

                // Xác định tin nhắn phù hợp với nhóm ngày này
                const messagesForThisDay = serverMessages.filter((msg) => {
                  const msgDate = new Date(msg.timestamp);

                  if (group.displayText === "Hôm nay") {
                    return isToday(msgDate);
                  } else if (group.displayText === "Hôm qua") {
                    return isYesterday(msgDate);
                  } else {
                    // Thử chuyển đổi date string của group sang Date object
                    try {
                      return isSameDay(msgDate, new Date(group.date));
                    } catch (error) {
                      console.warn(`Không thể phân tích ngày: ${group.date}`);
                      return false;
                    }
                  }
                });

                // Nếu là nhóm Hôm nay và không tìm thấy tin nhắn, thêm tất cả tin nhắn mới
                if (
                  messagesForThisDay.length === 0 &&
                  group.displayText === "Hôm nay" &&
                  serverMessages.length > 0
                ) {
                  return {
                    ...group,
                    messages: [...filteredMessages, ...serverMessages],
                  };
                }

                return {
                  ...group,
                  messages: [...filteredMessages, ...messagesForThisDay],
                };
              }
            );

            // Kiểm tra nếu không có nhóm Hôm nay và có tin nhắn mới, tạo nhóm mới
            const hasTodayGroup = updatedChatData.messagesByDate.some(
              (group) => group.displayText === "Hôm nay"
            );

            if (!hasTodayGroup && serverMessages.length > 0) {
              // Tạo nhóm Hôm nay mới và thêm tin nhắn
              updatedChatData.messagesByDate.push({
                date: new Date().toLocaleDateString("vi-VN"),
                displayText: "Hôm nay",
                messages: [...serverMessages],
              });
            }

            // Nếu conversation có lastMessage, cập nhật nó
            if (serverMessages.length > 0 && updatedChatData.conversation) {
              const lastMsg = serverMessages[serverMessages.length - 1];
              updatedChatData.conversation.lastMessage = {
                _id: lastMsg._id,
                senderId:
                  typeof lastMsg.senderId === "object"
                    ? lastMsg.senderId._id
                    : lastMsg.senderId,
                content: lastMsg.content || "",
                status: "sent", // Đảm bảo đặt status
                temporary: false, // Đảm bảo đặt temporary = false
                timestamp: lastMsg.timestamp,
              };
            }
            return updatedChatData;
          } catch (error) {
            console.error("Error updating chat data:", error);
            // Trong trường hợp lỗi, trả về prevChatData để không làm hỏng UI
            return prevChatData;
          }
        });

        // Thêm cuộn xuống thêm một lần nữa sau khi state đã được cập nhật
        setTimeout(() => {
          if (messageAreaRef && messageAreaRef.current) {
            messageAreaRef.current.scrollTop =
              messageAreaRef.current.scrollHeight;
          }
        }, 200);

        // Show success notification
        setSuccess(true);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");

      // Trong trường hợp lỗi, bạn có thể muốn xóa tin nhắn tạm thời đã thêm vào
      // bằng cách lọc ra các tin nhắn có _id bắt đầu bằng "temp-"
      if (chatData) {
        const filteredChatData = { ...chatData };

        // Lọc bỏ tin nhắn tạm thời khỏi messages
        if (filteredChatData.messages) {
          filteredChatData.messages = filteredChatData.messages.filter(
            (msg) => !msg._id.startsWith("temp-")
          );
        }

        // Lọc bỏ tin nhắn tạm thời khỏi messagesByDate
        if (filteredChatData.messagesByDate) {
          filteredChatData.messagesByDate = filteredChatData.messagesByDate.map(
            (group) => ({
              ...group,
              messages: group.messages.filter(
                (msg) => !msg._id.startsWith("temp-")
              ),
            })
          );
        }

        setChatData(filteredChatData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 right-[30px] bottom-[0px]">
      <div
        ref={modalRef}
        className="bg-white w-[40%] rounded shadow-lg overflow-hidden flex flex-col absolute right-0 bottom-5 h-[90%]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center">
            {shoppInfo?.bannerImageURL ? (
              <img
                src={shoppInfo?.bannerImageURL}
                alt="Shop Avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                {shoppInfo?.storeName?.charAt(0)?.toUpperCase() || "S"}
              </div>
            )}
            <div className="ml-3">
              <div className="font-medium">
                {shoppInfo?.storeName || "e.wil01"}
              </div>
              <div className="text-xs text-gray-500">
                {shoppInfo?.positiveRating || "98.7%"} Positive feedback
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <button
              className="text-gray-500 hover:text-gray-700 mx-2"
              aria-label="Menu"
            >
              •••
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Product info */}
        <div className="p-4 border-b border-gray-200 flex">
          <div className="w-20 h-20 overflow-hidden">
            <img
              src={product?.url || "https://picsum.photos/id/1/100"}
              alt={product?.title || "Product"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium line-clamp-2">
              {product?.title ||
                "Nike Air Jordan 1 Low Grey Gym Red - Size 8.5 UK / 9.5 US"}
            </h3>
            <div className="text-sm mt-1">
              {product?.price
                ? `£${(product.price / 100).toFixed(2)}`
                : "3,848,335.58 VND"}
            </div>
            <button className="mt-2 px-3 py-1 text-xs border border-gray-300 rounded-sm text-gray-700 hover:bg-gray-50">
              Make offer
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
          <div className="flex items-start">
            <FiInfo className="text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              Don't exchange contact info to buy or sell outside the platform.
              We scan and, in case of suspicious activity, manually analyze
              messages to identify potential fraud and policy violations.
              <a href="#" className="text-gray-600 underline ml-1">
                Learn more
              </a>
            </div>
          </div>
        </div>

        {/* Message area */}
        <div
          ref={messageAreaRef}
          className="flex-1 overflow-y-auto p-4 relative"
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 text-red-700 rounded mb-4 flex items-center text-sm">
              <div className="flex-1">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                <FiX size={16} />
              </button>
            </div>
          ) : (
            renderChatMessages(chatData, user?._id, messageAreaRef)
          )}

          {/* Image preview area for currently composing message */}
          {/* Image preview sẽ nổi ở phía dưới khung chat nhưng không phải fixed */}
          {previewImages.length > 0 && (
            <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md rounded-t-md mt-2">
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    Selected Images ({previewImages.length})
                  </span>
                  <button
                    onClick={() => setPreviewImages([])}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-thin scrollbar-thumb-gray-300">
                  {previewImages.map((image, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <img
                        src={image.url}
                        alt={`Preview ${index}`}
                        className="w-16 h-16 object-cover border border-gray-200 rounded"
                      />
                      {/* Hiển thị kích thước file */}
                      <span className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                        {(image?.size / (1024 * 1024)).toFixed(2)}MB
                      </span>
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full p-0.5"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="border-t border-gray-200 p-4">
          <div className="relative">
            {errorUpload && (
              <div className="absolute -top-12 left-0 right-0 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded flex justify-between items-center">
                <span>{errorUpload}</span>
                <button
                  onClick={() => setErrorUpload(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onSelect={handleTextareaSelect} // Thêm sự kiện onSelect
              onClick={handleTextareaSelect} // Thêm sự kiện onClick
              onKeyUp={handleTextareaSelect} // Thêm sự kiện onKeyUp
              placeholder="Send message"
              className="w-full border border-gray-300 rounded-sm p-3 pr-12 min-h-20 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              onKeyDown={(e) => {
                handleTextareaSelect(e); // Cập nhật cursorPosition khi nhấn phím
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="absolute right-2 bottom-2 flex">
              <button
                id="emoji-button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-gray-600 mr-1"
                aria-label="Add emoji"
                disabled={isLoading}
              >
                <FiSmile size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                multiple
                accept="image/*"
                className="hidden"
                disabled={isLoading}
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Add photo"
                disabled={isLoading}
              >
                <FiCamera size={20} />
              </button>
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-14 right-0 z-10"
              >
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  disableAutoFocus={true}
                  native
                />
              </div>
            )}
          </div>

          {/* Send button */}
          <div className="mt-2 flex justify-center">
            <button
              onClick={handleSendMessage}
              disabled={
                (!message.trim() && selectedImages.length === 0) || isLoading
              }
              className={`w-full py-3 rounded-md flex items-center justify-center ${
                (message.trim() || selectedImages.length > 0) && !isLoading
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin mr-2" size={16} />
                  Sending...
                </>
              ) : (
                "Send message"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSellerModal;
