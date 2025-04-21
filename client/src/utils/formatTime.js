// Định dạng thời gian hiển thị
export const formatMessageTime = (date) => {
  const now = new Date();
  const diff = now - date;
  const isToday = date.toDateString() === now.toDateString();
  
  // Nếu tin nhắn từ hôm nay, hiển thị giờ
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};