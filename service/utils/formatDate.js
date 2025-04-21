export function groupMessagesByDate(messages) {
  const grouped = {};
  
  messages.forEach(msg => {
    const date = new Date(msg.timestamp).toLocaleDateString();
    
    if (!grouped[date]) {
      grouped[date] = {
        date: date,
        displayText: getDisplayDate(msg.timestamp),
        messages: []
      };
    }
    
    grouped[date].messages.push(msg);
  });
  
  // Chuyển đổi thành mảng và sắp xếp theo ngày
  return Object.values(grouped).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
}

// Hàm hiển thị ngày theo định dạng người dùng
export function getDisplayDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Nếu là ngày hôm nay
  if (date.toDateString() === today.toDateString()) {
    return "Hôm nay";
  }
  
  // Nếu là ngày hôm qua
  if (date.toDateString() === yesterday.toDateString()) {
    return "Hôm qua";
  }
  
  // Định dạng ngày/tháng/năm
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
