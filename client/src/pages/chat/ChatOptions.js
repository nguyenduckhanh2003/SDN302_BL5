// src/components/chat/ChatOptions.jsx
import React from 'react';
import { Bookmark, Bell, Trash2 } from 'lucide-react';
import axios from '../../configs/axiosCustomize';

const ChatOptions = ({ conversationId, onClose }) => {
  const handleMarkAsUnread = async () => {
    try {
      await axios.patch(`/api/chat/conversations/${conversationId}/unread`);
      onClose();
      window.location.reload(); // Simple way to refresh the data
    } catch (error) {
      console.error('Lỗi khi đánh dấu chưa đọc:', error);
    }
  };
  
  const handlePinConversation = async () => {
    try {
      await axios.patch(`/api/chat/conversations/${conversationId}/pin`);
      onClose();
      window.location.reload(); // Simple way to refresh the data
    } catch (error) {
      console.error('Lỗi khi ghim trò chuyện:', error);
    }
  };
  
  const handleMuteNotifications = async () => {
    try {
      await axios.patch(`/api/chat/conversations/${conversationId}/mute`);
      onClose();
    } catch (error) {
      console.error('Lỗi khi tắt thông báo:', error);
    }
  };
  
  const handleDeleteConversation = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?')) {
      try {
        await axios.delete(`/api/chat/conversations/${conversationId}`);
        onClose();
        window.location.reload(); // Simple way to refresh the data
      } catch (error) {
        console.error('Lỗi khi xóa trò chuyện:', error);
      }
    }
  };
  
  return (
    <div className="absolute top-16 right-4 bg-white shadow-lg border border-gray-200 rounded-lg w-48 z-10">
      <ul className="py-1">
        <li 
          className="px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 cursor-pointer"
          onClick={handleMarkAsUnread}
        >
          <Bookmark size={16} />
          <span>Đánh dấu chưa đọc</span>
        </li>
        <li 
          className="px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 cursor-pointer"
          onClick={handlePinConversation}
        >
          <Bell size={16} />
          <span>Ghim Trò Chuyện</span>
        </li>
        <li 
          className="px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 cursor-pointer"
          onClick={handleMuteNotifications}
        >
          <Bell size={16} />
          <span>Tắt thông báo</span>
        </li>
        <li 
          className="px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 cursor-pointer text-red-500"
          onClick={handleDeleteConversation}
        >
          <Trash2 size={16} />
          <span>Xóa trò chuyện</span>
        </li>
      </ul>
    </div>
  );
};

export default ChatOptions;