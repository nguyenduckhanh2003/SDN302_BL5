import React, { useEffect, useRef, memo, useCallback, useState } from "react";
import { Check } from "lucide-react";
import Viewer from "react-viewer";

// Component hiển thị banner sản phẩm ở trên cùng
const ProductBanner = memo(({ product }) => {
  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 mb-4">
      <div className="p-3">
        <div className="text-sm text-gray-500 mb-2">
          Bạn đang trao đổi với Người mua về sản phẩm này
        </div>
        <div className="flex items-center">
          <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden mr-3">
            <img
              src={product.url || product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">{product.title}</div>
            <div className="text-red-600 text-sm">
              {typeof product.price === "string"
                ? product.price
                : `đ${product.price.toFixed(2).toString().replace(".", ",")}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Component hiển thị ngày (Hôm nay, Hôm qua...)
const DateSeparator = memo(({ text }) => {
  return (
    <div className="flex justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs py-1 px-3 rounded-full">
        {text}
      </div>
    </div>
  );
});

// Component hiển thị tin nhắn cùng với thông tin sản phẩm
const ChatMessage = memo(({ message, isCurrentUser }) => {
  const { content, imagesUrl, timestamp, productRef, status } = message;
  const isLoad = message?.temporary === true || status === "sending";
  
  // State to control image viewer visibility and active image
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Handle image click to open viewer at the correct index
  const handleImageClick = (index) => {
    setActiveImageIndex(index);
    setViewerVisible(true);
  };

  return (
    <div
      className={`mb-4 flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
    >
      {/* Container cho toàn bộ tin nhắn và sản phẩm */}
      <div
        className={`max-w-[70%] rounded-lg overflow-hidden ${
          isCurrentUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {/* Thông tin sản phẩm nếu có */}
        {productRef && productRef.productSnapshot && (
          <div className="bg-white border-b border-gray-200 p-2 flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden mr-2">
              <img
                src={productRef.productSnapshot.imageUrl}
                alt={productRef.productSnapshot.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-900">
                {productRef.productSnapshot.title}
              </div>
              <div className="text-xs text-red-600">
                đ
                {productRef.productSnapshot.price
                  .toFixed(2)
                  .toString()
                  .replace(".", ",")}
              </div>
            </div>
          </div>
        )}

        {/* Nội dung tin nhắn */}
        {content && (
          <div className="p-3">
            <div className="text-sm">{content}</div>
          </div>
        )}

        {/* Hình ảnh nếu có */}
        {imagesUrl && imagesUrl.length > 0 && (
          <div className={content ? "px-3 pb-3" : "p-3"}>
            {imagesUrl.length > 1 ? (
              // Nếu có nhiều hơn 1 hình ảnh, hiển thị dưới dạng thumbnail (2 trên 1 hàng)
              <div className="flex flex-wrap gap-2 items-center justify-start">
                {imagesUrl.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="rounded w-[calc(50%-0.25rem)] h-[125px] object-cover cursor-pointer"
                    onClick={() => handleImageClick(index)}
                    onError={(e) => {
                      e.target.src = '/api/placeholder/200/150';
                      e.target.alt = 'Image not available';
                    }}
                  />
                ))}
              </div>
            ) : (
              // Nếu chỉ có 1 hình ảnh, hiển thị kích thước lớn
              <img
                src={imagesUrl[0]}
                alt="Attachment"
                className="rounded max-w-full h-[250px] object-cover cursor-pointer"
                onClick={() => handleImageClick(0)}
                onError={(e) => {
                  e.target.src = '/api/placeholder/200/150';
                  e.target.alt = 'Image not available';
                }}
              />
            )}
            {/* Image Viewer */}
            <Viewer
              visible={viewerVisible}
              onClose={() => setViewerVisible(false)}
              images={imagesUrl.map((image, index) => ({
                src: image,
                alt: `Image ${index + 1}`,
              }))}
              activeIndex={activeImageIndex}
              zIndex={1000}
              downloadable={false}
              noClose={false}
              drag={true}
              zoomable={true}
              rotatable={true}
              scalable={true}
              showTotal={true}
              attribute={false}
            />
          </div>
        )}

        {/* Thời gian và trạng thái */}
        <div className="flex justify-end p-2 pt-0">
          <div
            className={`text-xs ${
              isCurrentUser ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </div>
        </div>
      </div>

      {/* Dấu tích hiển thị bên ngoài bubble tin nhắn nếu là tin nhắn của mình */}
      {isLoad ? (
        <span className="inline-block w-4 h-4 ml-1 rounded-full border-2 border-current border-t-transparent animate-spin self-end"></span>
      ) : (
        isCurrentUser && (
          <div className="ml-1 flex items-end pb-2">
            <Check size={16} className="text-blue-500" />
          </div>
        )
      )}
    </div>
  );
});

// Component chính hiển thị tất cả tin nhắn
const ChatDisplayContainer = ({ conversationData, currentUserId }) => {
  const messagesEndRef = useRef(null);
  console.log(conversationData);
  // Scroll to bottom khi có tin nhắn mới
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [conversationData]);

  if (!conversationData) return null;

  // Nhóm tin nhắn theo sản phẩm
  const renderMessagesByProduct = () => {
    // Tạo bản đồ để theo dõi sản phẩm nào đã hiển thị
    const shownProducts = new Map();

    return (
      <>
        {conversationData?.messagesByDate?.map((dateGroup, dateIndex) => (
          <div key={`date-${dateIndex}`}>
            {/* Hiển thị ngày */}
            <DateSeparator text={dateGroup.displayText} />

            {/* Xử lý tin nhắn trong ngày này */}
            {dateGroup.messages.map((message, msgIndex) => {
              const isCurrentUser = message.senderId._id === currentUserId;
              const productId = message.productRef?.productId;
              let showProductBanner = false;

              // Kiểm tra xem có cần hiển thị banner sản phẩm không
              if (productId && !shownProducts.has(productId)) {
                shownProducts.set(productId, true);
                showProductBanner = true;

                // Tìm thông tin sản phẩm từ conversation
                const productData = conversationData?.conversation?.products?.find(
                  (p) => p.productId._id === productId
                );

                if (showProductBanner && productData) {
                  return (
                    <React.Fragment key={`msg-${message._id}`}>
                      <ProductBanner product={productData.productId} />
                      <ChatMessage
                        message={message}
                        isCurrentUser={isCurrentUser}
                      />
                    </React.Fragment>
                  );
                }
              }

              return (
                <ChatMessage
                  key={`msg-${message._id}`}
                  message={message}
                  isCurrentUser={isCurrentUser}
                />
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </>
    );
  };

  return <div className="p-4 bg-gray-50">{renderMessagesByProduct()}</div>;
};

// Function để được sử dụng trong ContactSellerModal
export const renderChatMessages = (chatData, currentUserId, messageAreaRef) => {
  if (!chatData) return null;
  
  return (
    <div ref={messageAreaRef} className="flex-1 overflow-y-auto">
      <ChatDisplayContainer
        conversationData={chatData}
        currentUserId={currentUserId}
      />
    </div>
  );
};