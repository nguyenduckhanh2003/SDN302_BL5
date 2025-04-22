// src/components/chat/ChatHeader.jsx
import React from 'react';
import { ChevronDown, MessageSquare, X } from 'lucide-react';

const ChatHeader = ({ conversation, onToggleOptions, isOptionsOpen }) => {
  if (!conversation) return null;
  
  return (
    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img 
            src={conversation.avatar} 
            alt={conversation.name} 
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/User_icon_2.svg/640px-User_icon_2.svg.png'; // Fallback image
            }}
          />
          {/* Hiển thị trạng thái hoạt động */}
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
            conversation.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
        </div>
        <div>
          <h2 className="font-medium text-gray-900 flex items-center gap-1">
            {conversation.name}
            <div onClick={onToggleOptions} className="cursor-pointer">
              {isOptionsOpen ? 
                <ChevronDown size={16} className="text-gray-400 transform rotate-180" /> : 
                <ChevronDown size={16} className="text-gray-400" />
              }
            </div>
          </h2>
          <p className="text-xs text-gray-500">
            {conversation.status === 'Online' ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex gap-1 text-gray-600">
          <MessageSquare className="text-gray-500 cursor-pointer" size={20} />
          <ChevronDown className="text-gray-500 cursor-pointer" size={20} />
        </div>
        <X className="text-gray-500 cursor-pointer" size={20} />
      </div>
    </div>
  );
};

export default ChatHeader;