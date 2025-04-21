import React, { useEffect, useRef, useState } from 'react';
import { Package } from 'lucide-react';
import Viewer from 'react-viewer';
import ProductBanner, { BuyerProductBanner } from './ProductBanner';
import MessageBubble from './MessageBubble';

const Message = ({ message, products }) => {
  const imageRef = useRef();
  // State to control image viewer visibility and active image
  const [viewerVisible, setViewerVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Function to handle image loading and scroll to bottom
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.onload = () => {
        // Scroll to bottom when image loads
        const messagesContainer = document.querySelector('.overflow-y-auto');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      };
    }
  }, [message]);

  // Handle system messages (date separators, etc.)
  if (message.isSystem || message.type === "system") {
    // If this is a product banner system message
    if (message.id === "system-product" && products && products.length > 0) {
      return <BuyerProductBanner product={products[0]} />;
    }
    
    return (
      <div className="py-3 flex justify-center">
        <div className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
          {message.content || message.displayText}
        </div>
      </div>
    );
  }

  // Handle product banner messages
  if (message.type === "product-banner") {
    return message.sender === "buyer" 
      ? <BuyerProductBanner productRef={message.productRef} /> 
      : <ProductBanner productRef={message.productRef} />;
  }

  // Determine if the message is from the buyer (current user)
  const isSentByCurrentUser = message.sender === 'buyer' || message.sender === 'me';

  // Handle image click to open viewer at the correct index
  const handleImageClick = (index) => {
    setActiveImageIndex(index);
    setViewerVisible(true);
  };

  // Handle regular messages with MessageBubble component
  return (
    <MessageBubble 
      message={message}
      isSent={isSentByCurrentUser}
      isRead={message.isRead || message.status === 'read'}
      timestamp={message.time}
      product={message.product || (message.productRef && {
        title: message.productRef.productSnapshot.title,
        price: message.productRef.productSnapshot.price,
        imageUrl: message.productRef.productSnapshot.imageUrl
      })}
      showProduct={Boolean(message.product || message.productId || message.productRef)}
    >
      {/* Text content */}
      {(message.content || message.text) && (
        <p className="text-md whitespace-pre-wrap">{message.content || message.text}</p>
      )}
      
      {/* Image content */}
      {(message.image || (message.images && message.images.length > 0)) && (
        <div className="mt-2">
          {message.images && message.images.length > 1 ? (
            // If more than 1 image, display as thumbnails (2 per row)
            <div className="flex flex-wrap gap-2 w-full items-center justify-start">
              {message.images.map((image, index) => (
                <img
                  key={index}
                  ref={index === 0 ? imageRef : null} // Apply ref to the first image for scrolling
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="rounded-md w-[calc(50%-0.25rem)] h-[125px] object-cover cursor-pointer"
                  onClick={() => handleImageClick(index)}
                  onError={(e) => {
                    e.target.src = '/api/placeholder/200/150';
                    e.target.alt = 'Image not available';
                  }}
                />
              ))}
            </div>
          ) : (
            // If only 1 image, display it full size
            <img
              ref={imageRef}
              src={message.image || message.images[0]}
              alt="Attached"
              className="rounded-md max-w-full h-[250px] object-cover cursor-pointer"
              onClick={() => handleImageClick(0)}
              onError={(e) => {
                e.target.src = '/api/placeholder/200/150';
                e.target.alt = 'Image not available';
              }}
            />
          )}
          {/* Image Viewer */}
          {(message.image || message.images) && (
            <Viewer
              visible={viewerVisible}
              onClose={() => setViewerVisible(false)}
              images={
                message.images
                  ? message.images.map((image, index) => ({
                      src: image,
                      alt: `Image ${index + 1}`,
                    }))
                  : [{ src: message.image, alt: "Attached" }]
              }
              activeIndex={activeImageIndex}
              zIndex={1000}
              downloadable={false}
              noClose={false}
              drag={true}
              zoomable={true}
              rotatable={true}
              scalable={true}
            
            />
          )}
        </div>
      )}
    </MessageBubble>
  );
};

export default Message;