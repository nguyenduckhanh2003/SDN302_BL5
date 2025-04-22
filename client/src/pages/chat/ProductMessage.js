// src/components/chat/ProductMessage.jsx
import React from 'react';

const ProductMessage = ({ message }) => {
  console.log("Rendering ProductMessage component:", message);
  const product = message?.product || {};
  const imageUrl = product?.imageUrl || message?.image || '/api/placeholder/60/60';
  // Format price with Vietnamese currency
  const formatPrice = (price) => {
    if (!price) return '';
    
    // If it's already a formatted string (like "₫799.000 - ₫999.000")
    if (typeof price === 'string' && price.includes('₫')) {
      return price;
    }
    
    return `₫${price.toLocaleString('vi-VN')}`;
  };
  
  const displayPrice = formatPrice(product.price || message.price?.sale);
  const originalPrice = formatPrice(message.price?.original);
  
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%]">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-1">
          <div className="flex p-2">
            <img 
              src={imageUrl} 
              alt="Product" 
              className="w-16 h-16 object-cover mr-3 rounded-md"
              onError={(e) => {
                e.target.src = 'https://subiz.com.vn/blog/wp-content/uploads/2023/02/subiz-bao-bi-trong-marketing-bao-quan-san-pham-e1676812875330.png'; // Fallback image
                e.target.alt = 'Product image not available';
              }}
            />
            <div className="flex-1">
              <p className="text-sm mb-1">{message.content || product.title || 'Sản phẩm'}</p>
              <div className="flex flex-col">
                <span className="text-orange-500 font-medium">{displayPrice}</span>
                {originalPrice && (
                  <span className="text-gray-400 text-xs line-through">{originalPrice}</span>
                )}
              </div>
              <button 
                className="mt-2 px-3 py-1 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 transition-colors"
                onClick={() => window.open(`/product/${message.productId || product.productId}`, '_blank')}
              >
                Mua ngay
              </button>
            </div>
          </div>
        </div>
        {message.time && (
          <div className="mt-1 text-xs text-gray-500">
            <span>{message.time}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMessage;