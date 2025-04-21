import { useState, useRef, useEffect, memo, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Mail,
  Share,
  Send,
  ChevronDown,
  Settings,
  Menu,
  Users,
  Package,
  Image,
  Smile,
  X,
  Check,
} from "lucide-react";

import { useSelector } from "react-redux";
import ChatMessage from "./ChatMessage";
import {
  apimarkMessagesAsRead,
  getConversationHistory,
  getConversations,
  sendChatToBuyer,
} from "../../apis/chat/chat";
import { formatMessageTime } from "../../utils/formatTime";
import EmojiPicker from "emoji-picker-react";
import { authGetProfile } from "../../apis/auth/auth";
import "./ChatMessage.css"; // Assuming you have a CSS file for styles

// Import socket service
import {
  initSocket,
  getSocket,
  subscribeToMessages,
  subscribeToReadReceipts,
  subscribeToTypingStatus,
  sendTypingStatus,
  markMessagesAsRead as socketMarkAsRead,
  sendMessage,
  autoMarkAsRead,
  joinConversation,
} from "../../utils/socketService";

const SellerChat = () => {
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  // State for API data
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const [userProfile, setUserProfile] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(null);
  const [errorUpload, setErrorUpload] = useState(null);

  // Khởi tạo socket khi component mount nếu user đã đăng nhập
  useEffect(() => {
    if (user?._id) {
      const socket = initSocket(user._id);

      return () => {
        // Xóa các timeout khi unmount
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [user]);
  // Lắng nghe sự kiện typing status
  useEffect(() => {
    if (!user?._id) return;

    // Đăng ký lắng nghe sự kiện typing
    const unsubscribeTyping = subscribeToTypingStatus(user._id, (data) => {
      // Kiểm tra dữ liệu đầu vào
      if (!data.userId || !data.conversationId) {
        console.error("Dữ liệu typing không hợp lệ:", data);
        return;
      }

      // Cập nhật trạng thái typing
      setTypingUsers((prev) => {
        const newState = {
          ...prev,
          [data.userId]: data.isTyping,
        };
        return newState;
      });

      // Tự động xóa trạng thái typing sau 10 giây để tránh trường hợp stop_typing không được gửi
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            if (prev[data.userId]) {
              return {
                ...prev,
                [data.userId]: false,
              };
            }
            return prev;
          });
        }, 10000);
      }
    });

    return () => {
      console.log("Hủy đăng ký lắng nghe typing status");
      if (unsubscribeTyping) unsubscribeTyping();
    };
  }, [user]);
  // Cập nhật reference khi activeChat thay đổi
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Sửa lại phần lắng nghe tin nhắn mới
  useEffect(() => {
    if (!user?._id) return;

    // Lắng nghe tin nhắn mới
    const unsubscribeMessages = subscribeToMessages(user._id, (data) => {
      // Xử lý khi có tin nhắn mới gửi đến
      if (data.message && data.conversation) {
        // Cập nhật danh sách liên hệ để hiển thị tin nhắn mới
        setContacts((prevContacts) => {
          const updatedContacts = [...prevContacts];
          const contactIndex = updatedContacts.findIndex(
            (c) => c.id === data.conversation
          );

          if (contactIndex !== -1) {
            // Tạo bản sao của contact để cập nhật
            const updatedContact = { ...updatedContacts[contactIndex] };

            // Cập nhật tin nhắn mới nhất và thời gian
            updatedContact.message =
              data.message.content ||
              (data.message.imageUrl ? "Hình ảnh" : "Tin nhắn mới");
            updatedContact.time = formatMessageTime(
              new Date(data.message.timestamp || data.message.createdAt)
            );

            // Kiểm tra nếu tin nhắn từ người mua (không phải từ người bán hiện tại)
            const isFromBuyer = data.message.senderId !== user._id;

            // Tăng unreadCount nếu không phải là cuộc hội thoại đang xem và tin nhắn từ người mua
            if (activeChatRef.current !== data.conversation && isFromBuyer) {
              updatedContact.unreadCount =
                (updatedContact.unreadCount || 0) + 1;
              updatedContact.unread = true;
            }

            // Thay thế contact cũ bằng contact mới
            updatedContacts[contactIndex] = updatedContact;

            // Di chuyển contact này lên đầu danh sách
            const contactToMove = updatedContacts.splice(contactIndex, 1)[0];
            updatedContacts.unshift(contactToMove);

            return updatedContacts;
          }

          // Nếu không tìm thấy conversation, có thể đây là conversation mới
          // Gọi lại API để lấy danh sách mới
          fetchConversations();

          return prevContacts;
        });

        // Nếu đang xem cuộc trò chuyện này, thêm tin nhắn vào danh sách và đánh dấu đã đọc
        if (activeChatRef.current === data.conversation) {
          // Cập nhật UI với tin nhắn mới
          addNewMessage({ ...data.message, conversationId: data.conversation });

          // Kiểm tra nếu tin nhắn từ người mua (không phải từ người bán hiện tại)
          const isFromBuyer = data.message.senderId !== user._id;

          if (isFromBuyer) {
            // Đánh dấu tin nhắn đã đọc
            apimarkMessagesAsRead(data.conversation).then(() => {
              // Gửi thông báo qua socket rằng tin nhắn đã được đọc ngay lập tức
              autoMarkAsRead(
                data.conversation,
                user._id,
                typeof data.message.senderId === "object"
                  ? data.message.senderId._id
                  : data.message.senderId
              );
            });
          }
        }
      }
    });

    // Lắng nghe sự kiện đánh dấu đã đọc
    const unsubscribeReadReceipts = subscribeToReadReceipts(
      user._id,
      (data) => {
        if (data.conversationId && data.readBy) {
          // Cập nhật trạng thái tin nhắn trong danh sách nếu đang xem cuộc trò chuyện này
          if (activeChatRef.current === data.conversationId) {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => {
                if (msg.sender === "me" && msg.status !== "read") {
                  return { ...msg, status: "read" };
                }
                return msg;
              })
            );
          }
        }
      }
    );

    // Hàm dọn dẹp khi component unmount
    return () => {
      unsubscribeMessages();
      unsubscribeReadReceipts();
    };
  }, [user]);

  const handleSelectConversation = async (conversationId) => {
    setActiveChat(conversationId);

    // Tìm thông tin contact được chọn
    const selectedContact = contacts.find((c) => c.id === conversationId);

    if (!selectedContact) {
      console.error("Selected contact not found:", conversationId);
      return;
    }
    // YÊU CẦU JOIN VÀO CONVERSATION
    joinConversation(conversationId, user._id);
    // Tải tin nhắn cho cuộc trò chuyện này
    await fetchMessages(conversationId);
    // CHỈ đánh dấu đã đọc nếu có tin nhắn chưa đọc
    if (selectedContact.unread && selectedContact.unreadCount > 0) {
      try {
        // Cập nhật UI trước (optimistic update)
        setContacts((prevContacts) =>
          prevContacts.map((contact) =>
            contact.id === conversationId
              ? { ...contact, unread: false, unreadCount: 0 }
              : contact
          )
        );

        // Gọi API đánh dấu đã đọc
        autoMarkMessageAsRead(conversationId, user._id);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }
  };

  // Cập nhật function để xử lý tin nhắn mới
  // Sửa hàm addNewMessage để cập nhật trạng thái đã đọc khi nhận tin nhắn mới
  const addNewMessage = (newMessage) => {
    console.log("Adding new message:", newMessage);
    // Định dạng tin nhắn từ socket để phù hợp với định dạng hiện tại
    const now = new Date(
      newMessage.timestamp || newMessage.createdAt || new Date()
    );
    const formattedTime = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Xác định loại tin nhắn (từ người dùng hay từ bạn)
    const isSeller =
      newMessage.senderId === user?._id ||
      (typeof newMessage.senderId === "object" &&
        newMessage.senderId._id === user?._id);
    // Tạo tin nhắn mới để thêm vào UI
    const messageToAdd = {
      id: newMessage._id,
      sender: isSeller ? "me" : "user",
      text: newMessage.content || "",
      images: newMessage.imagesUrl ? newMessage.imagesUrl : [],
      time: formattedTime,
      status: isSeller ? "sent" : "read", // Nếu tin nhắn từ buyer, người bán đang xem nên tự động đánh dấu đã đọc
      productRef: newMessage.productRef,
      senderAvatar:
        typeof newMessage.senderId === "object"
          ? newMessage.senderId.avatar
          : null,
    };

    // Kiểm tra xem cần thêm tin nhắn ngày mới không
    const messageDate = new Date(newMessage.timestamp || newMessage.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateDisplayText = "";

    if (isToday(messageDate)) {
      dateDisplayText = "Hôm nay";
    } else if (isYesterday(messageDate)) {
      dateDisplayText = "Hôm qua";
    } else {
      dateDisplayText = messageDate.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    // Kiểm tra nếu cần thêm một tin nhắn ngày mới
    setMessages((prevMessages) => {
      // Tìm tin nhắn ngày cuối cùng
      const lastDateMessage = [...prevMessages]
        .reverse()
        .find((msg) => msg.type === "system");

      // Nếu không có tin nhắn ngày nào hoặc ngày khác với ngày của tin nhắn mới
      if (!lastDateMessage || lastDateMessage.displayText !== dateDisplayText) {
        // Thêm tin nhắn ngày mới và tin nhắn mới
        return [
          ...prevMessages,
          {
            id: `date-${new Date().getTime()}`,
            type: "system",
            displayText: dateDisplayText,
            timestamp: messageDate,
          },
          messageToAdd,
        ];
      }

      // Nếu đã có tin nhắn ngày phù hợp, chỉ thêm tin nhắn mới
      return [...prevMessages, messageToAdd];
    });

    // Cuộn xuống tin nhắn mới
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    // Nếu tin nhắn là từ người mua (không phải từ người bán) và đang xem cuộc trò chuyện này
    if (!isSeller && activeChatRef.current === newMessage.conversationId) {
      // Tự động đánh dấu đã đọc
      apimarkMessagesAsRead(newMessage.conversationId).then(() => {
        // Gửi thông báo cho người mua
        autoMarkAsRead(
          newMessage.conversationId,
          user._id,
          typeof newMessage.senderId === "object"
            ? newMessage.senderId._id
            : newMessage.senderId
        );
      });
    }
  };

  // Thêm function tự động đánh dấu tin nhắn đã đọc khi nhận được tin nhắn mới
  const autoMarkMessageAsRead = (conversationId, senderId) => {
    if (!user?._id || !conversationId) return;

    // Chỉ tự động đánh dấu đã đọc khi đang xem cuộc trò chuyện này
    if (activeChatRef.current === conversationId) {
      // Gọi API đánh dấu đã đọc
      apimarkMessagesAsRead(conversationId)
        .then(() => {
          // Gửi thông báo socket cho người gửi
          autoMarkAsRead(conversationId, user._id, senderId);

          // Cập nhật UI nếu cần
          setContacts((prevContacts) =>
            prevContacts.map((contact) =>
              contact.id === conversationId
                ? { ...contact, unread: false, unreadCount: 0 }
                : contact
            )
          );
        })
        .catch((error) => {
          console.error("Error auto-marking messages as read:", error);
        });
    }
  };

  // Load conversations (contacts) when component mounts
  useEffect(() => {
    fetchConversations();
    getProfile();
  }, []);

  const getProfile = async () => {
    const res = await authGetProfile();
    if (res) {
      setUserProfile(res);
    } else {
      throw new Error("Failed to fetch profile");
    }
  };

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

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      // Mark messages as read when opening a conversation
      markMessagesAsRead(activeChat);
    }
  }, [activeChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages]);

  // Scroll to bottom when first entering a chat
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      scrollToBottom();
    }
  }, [activeChat]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is yesterday
  const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  // Sửa function fetchConversations để hiển thị chính xác số tin nhắn chưa đọc
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await getConversations();
      if (response.success) {
        // Format the conversations data
        const formattedContacts = response.data.map((conv) => {
          const userSend = conv.buyer;
          const lastMsg = conv.lastMessage;

          // Kiểm tra trạng thái unread và chỉ hiển thị cho tin nhắn của người khác
          const isUnread = conv.unreadCount > 0;

          return {
            id: conv.conversationId, // Conversation ID
            userId: userSend._id,
            name: userSend?.fullname || "User",
            message: lastMsg
              ? lastMsg.content ||
                (lastMsg.imageUrl ? "Hình ảnh" : "Tin nhắn mới")
              : "",
            time: lastMsg ? formatMessageTime(new Date(lastMsg.timestamp)) : "",
            unread: isUnread, // Sử dụng unreadCount từ API
            unreadCount: conv.unreadCount || 0, // Đảm bảo luôn có giá trị, mặc định là 0
            avatar:
              userSend.avatar ||
              `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            products: conv.products || [], // Store products associated with conversation
          };
        });

        setContacts(formattedContacts);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Không thể tải danh sách hội thoại");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (conversationId) => {
    try {
      setLoading(true);
      const response = await getConversationHistory(conversationId);

      if (response.success) {
        const conversation = response.data.conversation;

        // Xác định ID của người bán/shop (user hiện tại)
        const sellerId = user._id;

        // Mảng tin nhắn đã được xử lý
        const formattedMessages = [];

        // Biến để theo dõi sản phẩm hiện tại trong cuộc thảo luận
        let currentProductId = null;

        // Xử lý tin nhắn theo ngày
        response.data.messagesByDate.forEach((dayGroup) => {
          // Thêm phân cách ngày
          formattedMessages.push({
            id: `date-${dayGroup.date}`,
            type: "system",
            displayText: dayGroup.displayText,
            timestamp: new Date(dayGroup.date),
          });

          // Xử lý từng tin nhắn trong ngày
          dayGroup.messages.forEach((msg) => {
            // Kiểm tra nếu tin nhắn có tham chiếu đến sản phẩm mới
            if (
              msg.productRef &&
              msg.productRef.productId &&
              currentProductId !== msg.productRef.productId
            ) {
              // Cập nhật sản phẩm hiện tại
              currentProductId = msg.productRef.productId;

              // Thêm banner sản phẩm mới vào cuộc hội thoại
              formattedMessages.push({
                id: `product-banner-${currentProductId}-${msg._id}`,
                type: "product-banner",
                productRef: msg.productRef,
              });
            }

            // Xác định người gửi
            const isSeller = msg.senderId._id === sellerId;
            // Định dạng thời gian - luôn hiển thị giờ:phút
            const messageTime = new Date(msg.timestamp || msg.createdAt);
            const formattedTime = messageTime.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            });
            // Thêm tin nhắn vào danh sách
            formattedMessages.push({
              id: msg._id,
              sender: isSeller ? "me" : "user",
              text: msg.content || "",
              images: msg.imagesUrl ? msg.imagesUrl : [],
              time: formattedTime,
              status: msg.status,
              productRef: msg.productRef,
              senderAvatar: msg.senderId.avatar,
            });
          });
        });

        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Không thể tải tin nhắn");
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (conversationId) => {
    try {
      const res = await apimarkMessagesAsRead(conversationId);

      // Thông báo qua socket
      socketMarkAsRead(conversationId, user._id);

      // Update the unread status in contacts list
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact.id === conversationId
            ? { ...contact, unread: false, unreadCount: 0 }
            : contact
        )
      );
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
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
    const oversizedFiles = files.filter((file) => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      // Có file vượt quá kích thước cho phép
      setError(
        `Kích thước file không được vượt quá 5MB. ${oversizedFiles.length} file vượt giới hạn.`
      );
      setTimeout(() => setError(null), 3000);

      // Nếu có các file hợp lệ, vẫn tiếp tục xử lý với các file đó
      const validFiles = files.filter((file) => file.size <= maxSize);
      if (validFiles.length === 0) return;

      // Xử lý các file hợp lệ
      const newImages = validFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setSelectedImages([...selectedImages, ...newImages]);
      return;
    }
    // Create preview URLs for selected images
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedImages([...selectedImages, ...newImages]);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeImage = (index) => {
    const newImages = [...selectedImages];
    // Release URL object to prevent memory leaks
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  // Handle typing status
  const handleTyping = () => {
    if (!activeChat) return;

    // Gửi trạng thái typing qua socket
    sendTypingStatus(activeChat, user._id, true);

    // Hủy timeout hiện tại nếu có
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Tạo timeout mới - sau 3 giây không gõ sẽ gửi stop_typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(activeChat, user._id, false);
    }, 3000);
  };

  // Emoji handling
  const onEmojiClick = (emojiObject, event) => {
    const emoji = emojiObject.emoji;
    const ref = inputRef.current;

    const start = cursorPosition ?? message.length;
    const before = message.slice(0, start);
    const after = message.slice(start);

    const newMessage = before + emoji + after;
    setMessage(newMessage);

    // Gửi trạng thái typing
    handleTyping();

    // Cập nhật lại vị trí con trỏ
    requestAnimationFrame(() => {
      ref.focus();
      const newPos = start + emoji.length;
      ref.setSelectionRange(newPos, newPos);
      setCursorPosition(newPos); // cập nhật vị trí mới
    });
  };

  const handleSendMessage = async () => {
    if (message.trim() || selectedImages.length > 0) {
      try {
        // Find active contact
        const activeContact = contacts.find((c) => c.id === activeChat);

        if (!activeContact) {
          throw new Error("No active contact selected");
        }

        // Dừng trạng thái typing
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          sendTypingStatus(activeChat, user._id, false);
        }

        // Create optimistic message for immediate display
        const now = new Date();
        const optimisticTime = formatMessageTime(now);
        const optimisticId = `temp-${now.getTime()}`;

        // Create optimistic messages array
        const optimisticMessages = [];

        if (message.trim()) {
          optimisticMessages.push({
            id: `${optimisticId}-text`,
            sender: "me",
            text: message.trim(),
            images: [],
            time: optimisticTime,
            status: "sending",
            temporary: true,
          });
        }
        console.log(selectedImages);
        if (selectedImages.length > 0) {
          optimisticMessages.push({
            id: `${optimisticId}-${selectedImages.length}-image`,
            sender: "me",
            text: "",
            images: selectedImages.map((img) => img.preview),
            time: optimisticTime,
            status: "sending",
            temporary: true,
          });
        }
        console.log("Optimistic messages:", optimisticMessages);
        // Save copy of input data for API request
        const messageCopy = message;
        const selectedImagesCopy = [...selectedImages];

        // Clear input before updating UI
        setMessage("");
        setSelectedImages([]);
        setShowEmojiPicker(false);

        // Update UI immediately with optimistic messages
        setMessages((prev) => [...prev, ...optimisticMessages]);

        // Update contact list with latest message
        if (optimisticMessages.length > 0) {
          const lastMessage = optimisticMessages[optimisticMessages.length - 1];
          setContacts((prevContacts) =>
            prevContacts.map((contact) =>
              contact.id === activeChat
                ? {
                    ...contact,
                    message: lastMessage.text || "Hình ảnh",
                    time: lastMessage.time,
                  }
                : contact
            )
          );
        }

        // Ensure scroll to bottom
        requestAnimationFrame(() => {
          scrollToBottom();
        });

        // Send API request
        try {
          const response = await sendChatToBuyer(
            messageCopy,
            selectedImagesCopy,
            activeContact.userId
          );
          if (response.success) {
            // Gửi tin nhắn qua socket
            if (response.data.messages && response.data.messages.length > 0) {
              response.data.messages.forEach((msg) => {
                // Gửi thông báo socket cho người nhận
                sendMessage({
                  ...msg,
                  conversationId: activeChat,
                  receiverId: activeContact.userId,
                });
              });
            }

            // THAY ĐỔI: Xóa bỏ hoàn toàn các tin nhắn temporary và thêm tin nhắn từ server
            setMessages((prevMessages) => {
              // Lọc bỏ hết các tin nhắn tạm thời
              const filteredMessages = prevMessages.filter(
                (msg) => !msg.temporary
              );

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

            // Update contacts with real message if needed
            if (response.data.messages.length > 0) {
              const lastServerMsg =
                response.data.messages[response.data.messages.length - 1];
              setContacts((prevContacts) =>
                prevContacts.map((contact) =>
                  contact.id === activeChat
                    ? {
                        ...contact,
                        message:
                          lastServerMsg.content ||
                          (lastServerMsg.imageUrl ? "Hình ảnh" : ""),
                        time: formatMessageTime(
                          new Date(lastServerMsg.createdAt || Date.now())
                        ),
                      }
                    : contact
                )
              );
            }
          } else {
            // Mark temporary messages as error
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.temporary ? { ...msg, status: "error" } : msg
              )
            );
            console.error("API error:", response);
          }
        } catch (err) {
          // Handle network errors
          setErrorUpload("Giới hạn 5 ảnh tối đa cho một lần gửi");
          console.error("Send message error:", err);
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.temporary ? { ...msg, status: "error" } : msg
            )
          );
        }
      } catch (err) {
        console.error("Error in handleSendMessage:", err);
        setError("Có lỗi xảy ra khi gửi tin nhắn");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent line break

      // Only send if there's content and not currently loading
      if ((message.trim() || selectedImages.length > 0) && !loading) {
        handleSendMessage();
      }
    }
  };

  // Get contact by ID
  const getContactById = (id) => {
    return contacts.find((c) => c.id === id) || {};
  };

  // Component hiển thị banner sản phẩm mới trong cuộc trò chuyện
  const ProductBanner = ({ productRef }) => {
    if (!productRef || !productRef.productSnapshot) return null;

    const product = productRef.productSnapshot;

    return (
      <div className="my-4 bg-white rounded-lg p-3 border border-gray-200 max-w-md mx-auto">
        <div className="text-sm text-gray-500 mb-2">
          Bạn đang trao đổi với Người mua về sản phẩm này
        </div>
        <div className="flex items-center">
          <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden mr-3">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={24} className="text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1 line-clamp-2">
              {product.title}
            </div>
            <div>
              <span className="text-red-600">
                ₫{product.price?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Component hiển thị tin nhắn hệ thống (ngày)
  const SystemMessage = ({ displayText }) => (
    <div className="py-3 flex justify-center">
      <div className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
        {displayText}
      </div>
    </div>
  );

  // Hàm render từng loại tin nhắn
  const renderMessage = useCallback((msg, contactAvatar, scrollToBottom) => {
    if (msg.type === "system") {
      return <SystemMessage displayText={msg.displayText} />;
    } else if (msg.type === "product-banner") {
      return <ProductBanner productRef={msg.productRef} />;
    } else {
      return (
        <ChatMessage
          msg={msg}
          contactAvatar={contactAvatar}
          scrollToBottom={scrollToBottom}
        />
      );
    }
  }, []);

  const isAnyoneTyping = () => {
    if (!activeChat) {
      console.log("Không có cuộc trò chuyện active");
      return false;
    }

    // Lấy thông tin contact đang active
    const activeContact = contacts.find((c) => c.id === activeChat);
    if (!activeContact) {
      console.log(
        "Không tìm thấy contact cho cuộc trò chuyện active:",
        activeChat
      );
      return false;
    }

    // Kiểm tra ID người dùng
    const userId = activeContact.userId;
    if (!userId) {
      console.log("Contact không có userId:", activeContact);
      return false;
    }

    // Kiểm tra trạng thái typing với kiểu dữ liệu khác nhau của userId
    const isTypingByString = Boolean(typingUsers[userId]);
    const isTypingByObject = userId._id
      ? Boolean(typingUsers[userId._id])
      : false;

    const isTyping = isTypingByString || isTypingByObject;
    return isTyping;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar with function icons */}
      <div className="w-16 bg-gray-800 text-white flex flex-col items-center py-4">
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg mb-6">
          <Menu size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Users size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg relative">
          <Mail size={20} />
          {contacts.filter((c) => c.unread).length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {contacts.filter((c) => c.unread).length}
            </span>
          )}
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Package size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Settings size={20} />
        </div>
      </div>

      {/* Conversations list */}
      <div className="w-96 border-r bg-white overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center">
          <h2 className="font-semibold text-lg">Hội thoại</h2>
          <div className="ml-2 flex items-center bg-gray-100 text-gray-500 rounded-full px-3 py-1 text-sm">
            <span>{userProfile?.store?.storeName}</span>
            <ChevronDown size={16} className="ml-1" />
          </div>
        </div>

        <div className="p-3 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-orange-500"
            />
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && contacts.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error && contacts.length === 0 ? (
            <div className="p-4 text-center text-red-500">
              {error}
              <button
                onClick={fetchConversations}
                className="block mx-auto mt-2 text-blue-500 hover:underline"
              >
                Thử lại
              </button>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Không có hội thoại nào
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  handleSelectConversation(contact.id);
                }}
                className={`flex p-3 border-b hover:bg-gray-50 cursor-pointer ${
                  activeChat === contact.id ? "bg-gray-100" : ""
                }`}
              >
                <div className="relative">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-12 h-12 rounded-full"
                  />
                  {contact.unread && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-sm truncate">
                      {contact.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {contact.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {contact.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <div className="flex items-center">
                <img
                  src={getContactById(activeChat).avatar}
                  alt="User"
                  className="w-8 h-8 rounded-full"
                />
                <h2 className="font-semibold ml-2">
                  {getContactById(activeChat).name}
                </h2>
              </div>
              <div className="flex gap-4">
                <button className="text-gray-500 hover:text-gray-700">
                  <Settings size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {/* Messages display area */}
              <div className="max-w mx-2">
                {loading && messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : error && messages.length === 0 ? (
                  <div className="p-4 text-center text-red-500">
                    {error}
                    <button
                      onClick={() => fetchMessages(activeChat)}
                      className="block mx-auto mt-2 text-blue-500 hover:underline"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => (
                      <div key={`${msg.id}-${index}`}>
                        {renderMessage(
                          msg,
                          getContactById(activeChat).avatar,
                          scrollToBottom
                        )}
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {isAnyoneTyping() && (
                      <div className="flex items-center my-2">
                        <div className="bg-gray-200 px-3 py-2 rounded-lg text-sm">
                          <div className="flex gap-1">
                            <span className="animate-typing-dot">•</span>
                            <span className="animate-typing-dot animation-delay-200">
                              •
                            </span>
                            <span className="animate-typing-dot animation-delay-400">
                              •
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty div for scrolling */}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>

            {/* Selected images preview */}
            {selectedImages.length > 0 && (
              <div className="px-4 py-2 border-t bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image.preview}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded-md border"
                      />
                      {/* Hiển thị kích thước file */}
                      <span className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                        {(image.file.size / (1024 * 1024)).toFixed(2)}MB
                      </span>
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message input area */}
            <div className="p-3 border-t bg-white relative">
              <div className="flex items-center">
                <div className="flex space-x-2 mr-2">
                  <button
                    onClick={triggerFileInput}
                    className="text-gray-500 hover:text-blue-500 p-2 rounded-full hover:bg-gray-100"
                    disabled={loading}
                  >
                    <Image size={20} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                    disabled={loading}
                  />
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-20 left-0 z-10"
                    >
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        disableAutoFocus={true}
                        native
                      />
                    </div>
                  )}
                  <button
                    id="emoji-button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-gray-500 hover:text-blue-500 p-2 rounded-full hover:bg-gray-100"
                    disabled={loading}
                  >
                    <Smile size={20} />
                  </button>
                </div>
                {error && (
                  <div className="absolute -top-10 left-0 right-0 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded flex justify-between items-center">
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
                  ref={inputRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setCursorPosition(e.target.selectionStart);
                    handleTyping(); // Gửi trạng thái typing
                  }}
                  onClick={(e) => setCursorPosition(e.target.selectionStart)}
                  onKeyUp={(e) => setCursorPosition(e.target.selectionStart)}
                  onKeyDown={handleKeyPress}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />

                <button
                  onClick={handleSendMessage}
                  disabled={
                    (!message.trim() && selectedImages.length === 0) || loading
                  }
                  className={`${
                    (!message.trim() && selectedImages.length === 0) || loading
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white px-3 py-3 rounded-[100%] ml-2`}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <img
              src="https://socialintents.b-cdn.net/blog/wp-content/uploads/2021/07/Live-chat-welcome-message.jpg"
              width={400}
              height={400}
              alt="Chào mừng"
              className="mb-6"
            />
            <h2 className="text-xl font-semibold mb-2">
              Chào mừng bạn đến với Ứng dụng Chat Shopee!
            </h2>
            <p className="text-gray-600 mb-6">
              Lựa chọn hội thoại từ danh sách để bắt đầu hoạt động bán hàng trên
              gian hàng Shopee
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(SellerChat);
