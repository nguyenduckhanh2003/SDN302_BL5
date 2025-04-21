// src/components/chat/TypingIndicator.jsx
import React, { memo } from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex items-start mb-4">
      <div className="bg-gray-200 px-3 py-2 rounded-lg">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );
};

export default memo(TypingIndicator);