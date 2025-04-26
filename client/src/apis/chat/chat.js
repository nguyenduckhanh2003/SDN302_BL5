import axios from "../../configs/axiosCustomize"
import { formatMessageTime } from "../../utils/formatTime";

const sendChatToSellerWithProduct = async (sellerId,productId,messageData) => {
  const formData = new FormData();
   // Add message text
   formData.append('message', messageData.message);
   
   // Add each image file
   if (messageData.images && messageData.images.length > 0) {
     messageData.images.forEach((image, index) => {
       formData.append(`images`, image);
     });
   }
    // Send the request
    const response = await axios.post(`/api/chat/${sellerId}/${productId}`,formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true, // To include cookies if needed for authentication
      }
    );
    
    return response;
   
}

// Fixed function to send chat message to buyer
const sendChatToSeller = async (message, selectedImages, conversationId,sellerId) => {
  console.log(selectedImages);
  const formData = new FormData();
  
  // Add message text
  formData.append('message', message);
  formData.append('conversationId', conversationId); 
  formData.append('sellerId', sellerId); 
  // Add each image file to formData
  if (selectedImages && selectedImages.length > 0) {
    selectedImages.forEach((image) => {
      // Access the actual file object, not the preview object
      formData.append('images', image.file);
    });
  }
  
  // Send the request to the correct endpoint with buyerId in the URL
  const response = await axios.post(
    `/api/chat/chat-to-seller`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true, // Include cookies for authentication
    }
  );
  
  return response;
};
const sendChatToBuyer = async (message, selectedImages, buyerId) => {
  const formData = new FormData();
  
  // Add message text
  formData.append('message', message);
  formData.append('buyerId', buyerId); // Add buyerId to formData
  // Add each image file to formData
  if (selectedImages && selectedImages.length > 0) {
    selectedImages.forEach((image) => {
      // Access the actual file object, not the preview object
      formData.append('images', image.file);
    });
  }
  
  // Send the request to the correct endpoint with buyerId in the URL
  const response = await axios.post(
    `/api/chat/chat-to-buyer`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true, // Include cookies for authentication
    }
  );
  
  return response;
};

const getConversations = async () => {
  const response = await axios.get('/api/chat/conversations/seller');
  return response;
}

const getConversationHistory = async (conversationId,page) => {
  try {
    const response = await axios.get(`/api/chat/messages/conversation/${conversationId}`,{
      params: { page }, // Gửi page như một tham số truy vấn,
      withCredentials: true, // Đảm bảo gửi cookie nếu cần thiết cho xác thực
      withXSRFToken: true, // Thêm tùy chọn này nếu bạn cần gửi token CSRF
    });
    return response;
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử tin nhắn:', error);
    throw error;
  }
};
const apimarkMessagesAsRead = async (conversationId) => {
  try {
    const response = await axios.patch(`/api/chat/messages/conversation/${conversationId}/read`);
    return response;
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái tin nhắn:', error);
    throw error;
  }
};

const getBuyerConversations = async () => {
  try {
    const response = await axios.get('/api/chat/conversations/buyer');
    return response;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
    throw error;
  }
}
const getConversationMessagesBuyer = async (conversationId) => {
  try {
    const response = await axios.get(`/api/chat/conversations/${conversationId}/messages`);
    return response;
  } catch (error) {
    console.error('Lỗi khi lấy tin nhắn trong cuộc trò chuyện:', error);
    throw error;
  }
};
const getConversationProducts = async (conversationId) => {
  try {
    const response = await axios.get(`/api/chat/conversations/${conversationId}/products`);
    return response;
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm trong cuộc trò chuyện:', error);
    throw error;
  }
};

const getConversationDetailBuyer = async (sellerId) => {
  try {
    const response = await axios.get(`/api/chat/messages/coversation/buyer`,{
      params: { sellerId } // Gửi sellerId như một tham số truy vấn
    });
    return response;
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết cuộc trò chuyện:', error);
    throw error;
  }
};

// Xử lý dữ liệu từ API thành định dạng hiển thị trong UI
export const processConversationData = (apiResponse) => {
  if (!apiResponse.success) {
    return { messages: [], messagesByDate: [] };
  }
  
  const { conversation, messages, messagesByDate } = apiResponse.data;
  
  // Xử lý các message thường
  const processedMessages = messages.map(msg => ({
    id: msg._id,
    sender: msg.senderId._id === localStorage.getItem('userId') ? 'me' : 'user',
    text: msg.content || '',
    images: msg.imageUrl ? [msg.imageUrl] : [],
    time: formatMessageTime(new Date(msg.timestamp || msg.createdAt)),
    status: msg.status,
    productRef: msg.productRef
  }));
  
  // Xử lý messages theo ngày để hiển thị divider
  const processedMessagesByDate = messagesByDate.map(group => ({
    date: group.date,
    displayText: group.displayText,
    messages: group.messages.map(msg => ({
      id: msg._id,
      sender: msg.senderId._id === localStorage.getItem('userId') ? 'me' : 'user',
      text: msg.content || '',
      images: msg.imageUrl ? [msg.imageUrl] : [],
      time: formatMessageTime(new Date(msg.timestamp || msg.createdAt)),
      status: msg.status,
      productRef: msg.productRef
    }))
  }));
  
  return { 
    messages: processedMessages,
    messagesByDate: processedMessagesByDate,
    conversation
  };
};

export {
  sendChatToSellerWithProduct,
  getConversationHistory,
  apimarkMessagesAsRead,
  getConversations,
  getBuyerConversations,
  getConversationMessagesBuyer,
  getConversationProducts,
  sendChatToBuyer,
  sendChatToSeller,
  getConversationDetailBuyer
}