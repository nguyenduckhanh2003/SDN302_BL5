import React from 'react';
import { Package } from 'lucide-react';

/**
 * Small product card that appears within a message bubble 
 */
const ProductInMessage = ({ product }) => {
  if (!product) return null;
  
  return (
    <div className="bg-white rounded-md shadow-sm p-2 mb-2">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden mr-2 flex-shrink-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://subiz.com.vn/blog/wp-content/uploads/2023/02/subiz-bao-bi-trong-marketing-bao-quan-san-pham-e1676812875330.png';
                e.target.alt = 'Product image not available';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={16} className="text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 truncate">
            {product.title || "Sản phẩm"}
          </div>
          <div className="text-xs text-red-600">
            ₫{(product.price || 0).toLocaleString('vi-VN')}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * A message bubble for seller/buyer chat
 */
const MessageBubble = ({ 
  message, 
  product,
  isSent = false,
  isRead = false,
  timestamp = '',
  showProduct = true,
  children
}) => {

  // Determine if this is a sender (me/buyer) or recipient (user/store) message
  const isSender = isSent; // Right side bubble
  
  // Kiểm tra nếu tin nhắn đang trong trạng thái gửi
  const isSending = message?.temporary || message?.sending || message?.status === 'sending';
  return (
    <div className={`flex mb-4 ${isSender ? "justify-end" : "justify-start"}`}>
      <div 
        className={`p-3 rounded-lg ${
          isSender 
            ? "bg-blue-500 text-white max-w-[45%]" 
            : "bg-gray-100 text-black max-w-[45%]"
        }`}
        style={{ wordBreak: "break-word" }}
      >
        {/* Product reference (if available and should be shown) */}
        {showProduct && product && <ProductInMessage product={product} />}
        
        {/* Message content */}
        {children}
        
        {/* Message time and status */}
        <div className="flex items-end mt-1">
          <div className="text-xs opacity-75">
            {timestamp}
          </div>
          
          {/* Hiển thị icon trạng thái tin nhắn */}
          {isSender && (
            <span className="ml-1 mt-0.5">
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isRead ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16C47F"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L9.1 15 6 12"></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14"></path>
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;