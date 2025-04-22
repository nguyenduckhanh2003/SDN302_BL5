import React, { useState } from "react";
import { Package } from "lucide-react";
import Viewer from "react-viewer";

const ChatMessage = React.memo(({ msg, contactAvatar, scrollToBottom }) => {
  // "me" là người bán (seller), "user" là người mua (buyer)
  const isSeller = msg.sender === "me";
  // State to control image viewer visibility and active image
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Handle image click to open viewer at the correct index
  const handleImageClick = (index) => {
    setActiveImageIndex(index);
    setViewerVisible(true);
  };
  return (
    <div className={`flex mb-3 ${isSeller ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg max-w-[45%] flex flex-col ${
          isSeller ? "items-end" : "items-start bg-gray-200 p-2"
        } ${msg.temporary ? "opacity-70" : ""}`}
        style={{ wordBreak: "break-word" }}
      >
        {msg.productRef && msg.productRef.productSnapshot ? (
          <div
            className={`p-3 rounded-lg max-w-xs ${
              isSeller ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
          >
            <div className="mb-2 p-2 bg-white rounded-md shadow-sm">
              <div className="flex items-center">
                <div className="w-[10] h-10 bg-gray-100 rounded overflow-hidden mr-2 flex-shrink-0">
                  {msg.productRef.productSnapshot.imageUrl ? (
                    <img
                      src={msg.productRef.productSnapshot.imageUrl}
                      alt={msg.productRef.productSnapshot.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 break-words">
                    {msg.productRef.productSnapshot.title}
                  </div>
                  <div className="text-xs text-red-600">
                    ₫
                    {msg.productRef.productSnapshot.price?.toLocaleString() ||
                      0}
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`p-1 rounded-lg w-fit wrap-anywhere ${
                isSeller ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              <p>{msg.text}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Text content */}
            {msg.text && (
              <div
                className={`p-2 rounded-lg w-fit wrap-anywhere ${
                  isSeller ? "bg-blue-500 text-white" : "bg-gray-200 pl-0"
                }`}
              >
                <p className="text-md whitespace-pre-wrap">{msg.text}</p>
              </div>
            )}
          </>
        )}

        {/* Images */}
        {msg.images && msg.images.length > 0 && (
          <div className="mt-2">
            {msg.images.length === 1 ? (
              // If only 1 image, display it full size
              <img
                src={msg.images[0]}
                alt="Shared image"
                className="rounded-md max-w-full h-[250px] object-cover cursor-pointer"
                onClick={() => handleImageClick(0)}
                onLoad={scrollToBottom}
              />
            ) : (
              // If more than 1 image, display as thumbnails (2 per row)
              <div className={`flex flex-wrap gap-2 w-full ${isSeller ? "bg-gray-200" : ""}  rounded-md p-2 items-center justify-start`}>
                {msg.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="rounded-md w-[calc(50%-0.25rem)] h-[125px] object-cover cursor-pointer"
                    onClick={() => handleImageClick(index)}
                    onLoad={scrollToBottom}
                  />
                ))}
              </div>
            )}
            <Viewer
              visible={viewerVisible}
              onClose={() => setViewerVisible(false)}
              images={msg.images.map((image, index) => ({
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

        {/* Message time and status */}
        <div
          className={`flex w-full items-center mt-1 text-xs text-gray-500 ${
            isSeller ? "justify-end" : "justify-start"
          }`}
        >
          <span>{msg.time}</span>
          {isSeller && (
            <span className="ml-1">
              {msg.temporary ? (
                <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"></span>
              ) : msg.status === "read" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(34 197 94 / 1)"
                  strokeWidth="2"
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
});

export default ChatMessage;