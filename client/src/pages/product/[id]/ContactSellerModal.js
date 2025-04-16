import React, { useState, useRef, useEffect } from "react";
import { FiX, FiCamera, FiInfo, FiSmile, FiPaperclip } from "react-icons/fi";
// Note: You'll need to install emoji-picker-react
// npm install emoji-picker-react
import EmojiPicker from 'emoji-picker-react';

const ContactSellerModal = ({ isOpen, onClose, seller, product }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  // Image handling functions
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files]);
      
      // Create preview URLs
      const newPreviewImages = files.map(file => ({
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      }));
      
      setPreviewImages(prev => [...prev, ...newPreviewImages]);
    }
  };
  
  const removeImage = (index) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(previewImages[index].url);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // Emoji handling
  const onEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    setMessage(prev => prev + emoji);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutsideEmoji = (event) => {
      if (emojiPickerRef.current && 
          !emojiPickerRef.current.contains(event.target) && 
          event.target.id !== "emoji-button") {
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
  
  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

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
      previewImages.forEach(image => URL.revokeObjectURL(image.url));
    };
  }, []);

  const handleSendMessage = () => {
    // Here you would implement the logic to send the message
    // For example, calling an API endpoint with both text and images
    
    console.log("Sending message to seller:", seller?.id);
    console.log("Message content:", message);
    console.log("Attached images:", selectedImages);
    
    // In a real implementation, you would typically:
    // 1. Create a FormData object
    // 2. Append the message text
    // 3. Append each image file
    // 4. Send via fetch or axios to your API
    
    // Clear message input and images, then close modal after sending
    setMessage("");
    setSelectedImages([]);
    setPreviewImages([]);
    onClose();
    
    // You could show a "Message sent" notification here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 right-[30px] bottom-[0px]">
      <div 
        ref={modalRef}
        className="bg-white w-96 rounded shadow-lg overflow-hidden flex flex-col absolute right-0 bottom-5 h-[90%]"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
              {seller?.username?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div className="ml-3">
              <div className="font-medium">{seller?.username || "e.wil01"}</div>
              <div className="text-xs text-gray-500">
                {seller?.positiveRating || "98.7%"} Positive feedback
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
              {product?.title || "Nike Air Jordan 1 Low Grey Gym Red - Size 8.5 UK / 9.5 US"}
            </h3>
            <div className="text-sm mt-1">
              {product?.price ? `£${(product.price / 100).toFixed(2)}` : "3,848,335.58 VND"}
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
              Don't exchange contact info to buy or sell outside the platform. We scan and, in case of suspicious activity, manually analyze messages to identify potential fraud and policy violations. 
              <a href="#" className="text-gray-600 underline ml-1">Learn more</a>
            </div>
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Here you could render previous messages */}
          <div className="min-h-20"></div>
          
          {/* Image preview area */}
          {previewImages.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-2">
                {previewImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={image.url} 
                      alt={`Preview ${index}`} 
                      className="w-full h-24 object-cover border border-gray-200 rounded"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="border-t border-gray-200 p-4">
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send message"
              className="w-full border border-gray-300 rounded-sm p-3 pr-12 min-h-20 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute right-2 bottom-2 flex">
              <button 
                id="emoji-button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-gray-600 mr-1"
                aria-label="Add emoji"
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
              />
              <button 
                onClick={() => fileInputRef.current.click()}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Add photo"
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
              disabled={!message.trim() && selectedImages.length === 0}
              className={`w-full py-3 rounded-sm ${
                message.trim() || selectedImages.length > 0
                  ? "bg-gray-300 hover:bg-gray-400 text-gray-800" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Send message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSellerModal;