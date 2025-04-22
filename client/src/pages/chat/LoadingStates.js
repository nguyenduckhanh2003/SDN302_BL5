// src/components/chat/LoadingStates.jsx
import React from 'react';

export const ChatListSkeleton = () => {
  return (
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
  );
};

export const MessagesSkeleton = () => {
  return (
    <div className="animate-pulse flex flex-col space-y-4 p-4">
      {[1, 2, 3, 4].map(i => (
        <div key={`loading-${i}`} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-[70%] p-4 rounded-lg ${i % 2 === 0 ? 'bg-gray-200' : 'bg-blue-200'}`}>
            <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-32"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ProductMessageSkeleton = () => {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[80%]">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-1 p-2">
          <div className="flex">
            <div className="w-16 h-16 bg-gray-300 rounded-md mr-3"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/3"></div>
              <div className="h-6 bg-gray-300 rounded w-1/4 mt-2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmptyConversations = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <p className="text-gray-500">Bạn chưa có cuộc trò chuyện nào</p>
      <p className="text-sm text-gray-400 mt-2">Hãy liên hệ với người bán để bắt đầu trò chuyện</p>
    </div>
  );
};

export const EmptyMessages = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="text-center">
        <p className="text-gray-500 mb-2">Chưa có tin nhắn nào</p>
        <p className="text-sm text-gray-400">Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
      </div>
    </div>
  );
};

export const ErrorDisplay = ({ message, onRetry }) => {
  return (
    <div className="flex justify-center items-center h-full flex-col">
      <p className="text-red-500 mb-2">{message || 'Đã xảy ra lỗi'}</p>
      {onRetry && (
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          onClick={onRetry}
        >
          Thử lại
        </button>
      )}
    </div>
  );
};

export const UploadProgress = ({ progress }) => {
  return (
    <div className="mb-2">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 mt-1 text-center">Đang tải lên: {progress}%</p>
    </div>
  );
};

export default {
  ChatListSkeleton,
  MessagesSkeleton,
  ProductMessageSkeleton,
  EmptyConversations,
  EmptyMessages,
  ErrorDisplay,
  UploadProgress
};