// src/components/chat/ChatList.jsx
import React from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import ChatOptions from './ChatOptions';

const ChatList = ({ 
  conversations, 
  currentConversationId, 
  loading, 
  onSelectConversation, 
  onToggleOptions,
  expandedOptions 
}) => {
  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col h-full border-r border-gray-200">
        <div className="p-3 border-b border-gray-200 flex items-center gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Tìm theo tên" 
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none text-sm"
              disabled={loading}
            />
            <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
          </div>
          <div className="flex items-center gap-1 text-gray-600 text-sm border border-gray-300 rounded px-2 py-1.5">
            <span>Tất cả</span>
            <ChevronDown size={16} />
          </div>
        </div>
        
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-pulse flex flex-col w-full p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start space-x-3">
                <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-300 rounded w-8"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Tìm theo tên" 
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none text-sm"
          />
          <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
        </div>
        <div className="flex items-center gap-1 text-gray-600 text-sm border border-gray-300 rounded px-2 py-1.5">
          <span>Tất cả</span>
          <ChevronDown size={16} />
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-gray-500">Bạn chưa có cuộc trò chuyện nào</p>
            <p className="text-sm text-gray-400 mt-2">Hãy liên hệ với người bán để bắt đầu trò chuyện</p>
          </div>
        ) : (
          conversations.map(conversation => (
            <div 
              key={conversation.id}
              className={`p-3 border-b border-gray-100 flex items-start gap-3 cursor-pointer ${currentConversationId === conversation.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              onClick={() => onSelectConversation(conversation.id,conversation.sellerId)}
            >
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
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  conversation.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                
                {/* Hiển thị tin nhắn chưa đọc */}
                {conversation.unread && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                    {conversation.unreadCount > 0 ? conversation.unreadCount : ''}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-sm text-gray-900 truncate">{conversation.name}</h3>
                  <span className="text-xs text-gray-500">{conversation.time}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
              </div>
              {currentConversationId === conversation.id && (
                <div onClick={(e) => {
                  e.stopPropagation();
                  onToggleOptions(conversation.id);
                }}>
                  {expandedOptions === conversation.id ? 
                    <ChevronUp size={16} className="text-gray-400" /> : 
                    <ChevronDown size={16} className="text-gray-400" />
                  }
                </div>
              )}
              {expandedOptions === conversation.id && (
                <ChatOptions 
                  conversationId={conversation.id} 
                  onClose={() => onToggleOptions(null)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;