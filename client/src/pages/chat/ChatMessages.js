// src/components/chat/ChatMessages.jsx
import React, { useRef, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import Message from './Message';
import MessageInput from './MessageInput';
import { MessageSquare } from 'lucide-react';
import TypingIndicator from './TypingIndicator'; // Import component TypingIndicator

const ChatMessages = ({ 
  messages, 
  products, 
  currentConversationId, 
  currentSellerId,
  loading, 
  uploadLoading,
  setUploadLoading,
  conversations,
  onMessageSent,
  setMessages,
  expandedOptions,
  onToggleOptions,
  isTyping,
  renderMessage
}) => {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when messages change or when typing status changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  if (!currentConversationId) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-700">Tin nhắn</h3>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-center p-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <MessageSquare size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Chưa có tin nhắn nào</h3>
            <p className="text-gray-500">Hãy chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        </div>
      </div>
    );
  }
  
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <ChatHeader 
          conversation={currentConversation} 
          onToggleOptions={() => onToggleOptions(currentConversationId)}
          isOptionsOpen={expandedOptions === currentConversationId}
        />
        
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          <div className="animate-pulse flex flex-col space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={`loading-${i}`} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] p-4 rounded-lg ${i % 2 === 0 ? 'bg-gray-200' : 'bg-blue-200'}`}>
                  <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <MessageInput 
          setMessages={setMessages}
          conversationId={currentConversationId}
          sellerId={currentSellerId}
          onMessageSent={onMessageSent}
          disabled={true}
          uploadLoading={uploadLoading}
          setUploadLoading={setUploadLoading}
        />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <ChatHeader 
        conversation={currentConversation} 
        onToggleOptions={() => onToggleOptions(currentConversationId)}
        isOptionsOpen={expandedOptions === currentConversationId}
      />
      
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Chưa có tin nhắn nào</p>
              <p className="text-sm text-gray-400">Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => {
              // Sử dụng renderMessage cho các loại tin nhắn đặc biệt nếu được cung cấp
              if (renderMessage && (message.type === "system" || message.type === "product-banner")) {
                return (
                  <div key={message.id || `msg-${message.type}`}>
                    {renderMessage(message)}
                  </div>
                );
              }
              
              // Mặc định sử dụng component Message
              return (
                <Message 
                  key={message.id} 
                  message={message} 
                  products={products}
                />
              );
            })}
            
            {/* Typing indicator */}
            {isTyping && <TypingIndicator key="typing-indicator"/>}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <MessageInput 
        conversationId={currentConversationId}
        sellerId={currentSellerId}
        onMessageSent={onMessageSent}
        setMessages={setMessages}
        uploadLoading={uploadLoading}
        setUploadLoading={setUploadLoading}
      />
    </div>
  );
};

export default ChatMessages;