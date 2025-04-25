// src/components/chat/ChatApp.jsx
import React, { useState, useEffect, useRef } from "react";
import { X, Package } from "lucide-react";
import ChatList from "./ChatList";
import ChatMessages from "./ChatMessages";
import { useSelector } from "react-redux";
import {
  apimarkMessagesAsRead,
  getBuyerConversations,
  getConversationHistory,
} from "../../apis/chat/chat";
import {
  initSocket,
  subscribeToMessages,
  subscribeToReadReceipts,
  markMessagesAsRead,
  sendTypingStatus,
  subscribeToUserStatus,
  getSocket,
  autoMarkAsRead,
  joinConversation,
  subscribeToTypingStatus,
} from "../../utils/socketService";
import "./ChatMessage.css"; // Assuming you have a CSS file for styles

const ChatApp = () => {
  // State Management
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [currentSellerId, setCurrentSellerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedOptions, setExpandedOptions] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [sellerStatus, setSellerStatus] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const currentConversationRef = useRef(null);

  // Theo dõi currentConversation bằng ref để sử dụng trong các callback
  useEffect(() => {
    fetchConversations();
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);
  // Initialize socket connection

  useEffect(() => {
    if (user && user._id) {
      // Initialize socket
      const socket = initSocket(user);
      // Subscribe to new messages
      const unsubscribeMessages = subscribeToMessages(user._id, (data) => {
        if (data.type === "new_message") {
          handleNewMessage(data);
        }
      });

      // Subscribe to read receipts
      const unsubscribeReadReceipts = subscribeToReadReceipts(
        user._id,
        (data) => {
          if (data.type === "messages_read") {
            handleReadReceipts(data);
          }
        }
      );

      // Subscribe to typing status
      socket.on("typing", (data) => {
        if (data.conversationId && data.userId !== user._id) {
          setTypingUsers((prev) => ({
            ...prev,
            [data.conversationId]: true,
          }));
        }
      });

      socket.on("stop_typing", (data) => {
        if (data.conversationId && data.userId !== user._id) {
          setTypingUsers((prev) => ({
            ...prev,
            [data.conversationId]: false,
          }));
        }
      });

      // Cleanup on unmount
      return () => {
        unsubscribeReadReceipts();
        socket.off("typing");
        socket.off("stop_typing");
      };
    }
  }, [user]);
  useEffect(() => {
    if (!user?._id) return;

    console.log("Đăng ký lắng nghe sự kiện typing status cho user:", user._id);

    // Đăng ký lắng nghe sự kiện typing
    const unsubscribeTyping = subscribeToTypingStatus(user._id, (data) => {
      console.log("Nhận được sự kiện typing:", data);

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
        console.log("Cập nhật trạng thái typing users:", newState);
        return newState;
      });
      console.log("Typing status:", typingUsers);

      // Tự động xóa trạng thái typing sau 10 giây để tránh trường hợp stop_typing không được gửi
      if (data.isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => {
            if (prev[data.userId]) {
              console.log(
                "Tự động xóa trạng thái typing sau 10s:",
                data.userId
              );
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
  // Subscribe to seller status when conversation changes

  useEffect(() => {
    if (currentSellerId) {
      const unsubscribeStatus = subscribeToUserStatus(
        currentSellerId,
        (status) => {
          setSellerStatus((prev) => ({
            ...prev,
            [currentSellerId]: status.isOnline,
          }));
        }
      ); 

      return () => {
        if (unsubscribeStatus) unsubscribeStatus();
      };
    }
  }, [currentSellerId]);

  // Updated handleNewMessage function for ChatApp.js
  const handleNewMessage = (data) => {
    const { message, conversation: conversationId } = data;

    // Add message to current conversation if it's active
    if (currentConversationRef.current === conversationId) {
      // Format time
      const messageTime = new Date(message.timestamp || message.createdAt);
      const formattedTime = messageTime.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Add new message to the list
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: message._id,
          content: message.content || "",
          sender: "user",
          text: message.content || "",
          images: message.imagesUrl,
          time: formattedTime,
          isRead: false,
          status: "sent",
          productRef: message.productRef,
        },
      ]);

      // Đánh dấu là đã đọc vì người dùng đang xem cuộc trò chuyện này
      apimarkMessagesAsRead(conversationId);

      // Gửi thông báo qua socket rằng tin nhắn đã được đọc ngay lập tức
      if (message.senderId !== user._id) {
        autoMarkAsRead(conversationId, user._id, message.senderId);
      }
    }

    // Update conversation list with new message
    updateConversationWithNewMessage(conversationId, message);
  };

  const handleReadReceipts = (data) => {
    const { conversationId, readBy, readAt } = data;

    // Update messages in current conversation
    if (currentConversationRef.current === conversationId) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          // Chỉnh sửa điều kiện: Cập nhật cho tất cả tin nhắn của người dùng hiện tại mà chưa đọc
          if (msg.sender === "me" && msg.status !== "read") {
            console.log("Cập nhật tin nhắn đã đọc:", msg.id);
            return { ...msg, isRead: true, status: "read", readAt };
          }
          return msg;
        })
      );
    }

    // Cập nhật trạng thái đã đọc trong danh sách cuộc trò chuyện
    updateConversationReadStatus(conversationId, readBy);
  };

  // Cập nhật trạng thái đã đọc trong danh sách cuộc trò chuyện
  const updateConversationReadStatus = (conversationId, readBy) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === conversationId && readBy !== user._id) {
          // Người khác đã đọc tin nhắn của chúng ta
          return {
            ...conv,
            lastMessageRead: true,
          };
        }
        return conv;
      })
    );
  };

  // Update conversation list with new message
  const updateConversationWithNewMessage = (conversationId, message) => {
    setConversations((prevConversations) => {
      const existingConversation = prevConversations.find(
        (c) => c.id === conversationId
      );

      if (!existingConversation) {
        // Nếu không tìm thấy cuộc trò chuyện, gọi API để cập nhật lại danh sách
        fetchConversations();
        return prevConversations;
      }

      return prevConversations.map((conv) => {
        if (conv.id === conversationId) {
          // Calculate unread count
          const isFromMe = message.senderId === user._id;
          const newUnreadCount = isFromMe
            ? 0
            : // Nếu đang xem cuộc trò chuyện này thì không tăng unread
            currentConversationRef.current === conversationId
            ? 0
            : (conv.unreadCount || 0) + 1;

          return {
            ...conv,
            lastMessage: message.content || "[Hình ảnh]",
            sender: isFromMe ? "me" : "user",
            time: formatTime(new Date(message.timestamp || message.createdAt)),
            unread:
              !isFromMe && currentConversationRef.current !== conversationId,
            unreadCount: newUnreadCount,
          };
        }
        return conv;
      });
    });
  };

  // Fetch conversation list
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await getBuyerConversations();
      if (response.success) {
        const formattedConversations = response.data.map((conversation) => ({
          id: conversation._id,
          name: conversation.store.storeName,
          avatar: conversation.store.bannerImageURL || "/api/placeholder/40/40",
          lastMessage: conversation.lastMessage?.content || "[Hình ảnh]",
          time: formatTime(conversation.updatedAt),
          unread: conversation.unreadCount > 0,
          unreadCount: conversation.unreadCount,
          sellerId: conversation.seller._id,
          sender: conversation?.lastMessage?.senderId=== user._id ? "me" : "user",
          status: sellerStatus[conversation.seller._id] ? "Online" : "Offline",
        }));

        setConversations(formattedConversations);
        // Đăng ký lắng nghe trạng thái online cho tất cả người bán
        formattedConversations.forEach((conv) => {
          subscribeToUserStatus(conv.sellerId, (status) => {
            setSellerStatus((prev) => ({
              ...prev,
              [conv.sellerId]: status.isOnline,
            }));
            setConversations((prevConversations) =>
              prevConversations.map((c) =>
                c.sellerId === conv.sellerId
                  ? { ...c, status: status.isOnline ? "Online" : "Offline" }
                  : c
              )
            );
          });
        });
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Không thể tải cuộc trò chuyện. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!currentConversation) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // YÊU CẦU JOIN VÀO CONVERSATION
        joinConversation(currentConversation, user._id);
        const response = await getConversationHistory(currentConversation);

        if (response.success) {
          // Xác định ID của người mua (user hiện tại)
          const buyerId = user._id;

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
              const isBuyer = msg.senderId._id === buyerId;
              // Định dạng thời gian - luôn hiển thị giờ:phút
              const messageTime = new Date(msg.timestamp || msg.createdAt);
              const formattedTime = messageTime.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });

              // Thêm tin nhắn vào danh sách
              formattedMessages.push({
                id: msg._id,
                sender: isBuyer ? "buyer" : "store",
                content: msg.content || "",
                text: msg.content || "",
                images: msg.imagesUrl ? msg.imagesUrl : [],
                image: msg.imageUrl,
                time: formattedTime,
                isRead: msg.status === "read",
                status: msg.status,
                productRef: msg.productRef,
                product: msg.productRef
                  ? {
                      title: msg.productRef.productSnapshot.title,
                      price: msg.productRef.productSnapshot.price,
                      imageUrl: msg.productRef.productSnapshot.imageUrl,
                      productId: msg.productRef.productId,
                    }
                  : null,
                productId: msg.productRef ? msg.productRef.productId : null,
              });
            });
          });

          setMessages(formattedMessages);

          // Đánh dấu tin nhắn đã đọc khi mở cuộc trò chuyện
          markConversationAsRead(currentConversation, currentSellerId);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError("Không thể tải tin nhắn");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentConversation, user._id]);

  // Đánh dấu cuộc trò chuyện là đã đọc khi mở
  const markConversationAsRead = async (conversationId, sellerId) => {
    try {
      // Gọi API đánh dấu đã đọc
      await apimarkMessagesAsRead(conversationId);

      // Gửi thông báo socket cho người bán
      autoMarkAsRead(conversationId, user._id, sellerId);

      // Cập nhật UI hiển thị (optimistic update)
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unread: false, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  // Component hiển thị banner sản phẩm mới trong cuộc trò chuyện
  const ProductBanner = ({ productRef }) => {
    if (!productRef || !productRef.productSnapshot) return null;

    const product = productRef.productSnapshot;

    return (
      <div className="my-4 bg-white rounded-lg p-3 border border-gray-200 max-w-md mx-auto">
        <div className="text-sm text-gray-500 mb-2">
          Bạn đang trao đổi với Người bán về sản phẩm này
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

  // Format time for conversation list
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays < 7) {
      // Less than a week - show number of days
      return diffDays.toString();
    } else {
      // More than a week - show date
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle conversation selection
  const handleSelectConversation = async (conversationId, sellerId) => {
    setCurrentConversation(conversationId);
    setCurrentSellerId(sellerId);
    // Mark messages as read when selecting a conversation
    try {
      // Update UI first (optimistic update)
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              unread: false,
              unreadCount: 0,
            };
          }
          return conv;
        });
      });

      // Call API to mark messages as read
      await apimarkMessagesAsRead(conversationId);

      // Thông báo qua socket cho người bán
      autoMarkAsRead(conversationId, user._id, sellerId);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // Toggle chat options menu
  const toggleOptionsMenu = (conversationId) => {
    setExpandedOptions(
      expandedOptions === conversationId ? null : conversationId
    );
  };

  // Handle message received (update state after sending message)
  const handleMessageSent = (newMessage) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    // Update the conversation list to show the latest message
    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            sender: "me",
            lastMessage: newMessage.content || "[Hình ảnh]",
            time: formatTime(new Date()),
          };
        }
        return conv;
      });
    });
    console.log(conversations);
  };
  
  const isAnyoneTyping = () => {
    if (!currentConversation) {
      console.log("Không có cuộc trò chuyện active");
      return false;
    }

    // Lấy thông tin contact đang active
    const activeContact = conversations.find(
      (c) => c.id === currentConversation
    );
    if (!activeContact) {
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
    <div className="w-full h-screen flex shadow-lg bg-white">
      <div className="w-72 flex-shrink-0 h-full">
        <ChatList
          conversations={conversations}
          currentConversationId={currentConversation}
          loading={loading}
          onSelectConversation={handleSelectConversation}
          onToggleOptions={toggleOptionsMenu}
          expandedOptions={expandedOptions}
        />
      </div>
      <div className="flex-1 flex flex-col relative h-full">
        <ChatMessages
          messages={messages}
          products={products}
          currentConversationId={currentConversation}
          currentSellerId={currentSellerId}
          loading={loading}
          uploadLoading={uploadLoading}
          setUploadLoading={setUploadLoading}
          conversations={conversations}
          onMessageSent={handleMessageSent}
          setMessages={setMessages}
          expandedOptions={expandedOptions}
          onToggleOptions={toggleOptionsMenu}
          isTyping={typingUsers[currentConversation]}
          renderMessage={(msg) => {
            if (msg.type === "system") {
              return <SystemMessage displayText={msg.displayText} />;
            } else if (msg.type === "product-banner") {
              return <ProductBanner productRef={msg.productRef} />;
            }
            return null; // Let ChatMessages handle regular messages
          }}
        />
      </div>

      {/* Error toast notification */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md">
          <div className="flex">
            <div className="py-1">
              <svg
                className="h-6 w-6 text-red-500 mr-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold">Lỗi</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto pl-3">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;
