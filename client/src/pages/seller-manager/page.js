import { useState, useRef } from 'react';
import { MessageSquare, Search, Mail, Share, Send, ChevronDown, Settings, HelpCircle, Menu, Users, Shield, BarChart2, Package, Grid, ShoppingCart, Image, Smile, Paperclip, X } from 'lucide-react';
// Để sử dụng thư viện emoji picker, cần cài đặt:
// npm install emoji-picker-react

// Thêm import này ở đầu file
import EmojiPicker from 'emoji-picker-react';

export default function SellManager() {
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const fileInputRef = useRef(null);
  
  const contacts = [
    { id: 1, name: 'huynhkhanhmhy814420', message: 'Cảm ơn bạn đã quan tâm đến s...', time: '18:32', unread: true, avatar: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, name: 'chungbeogrif65', message: 'Shop còn bán hàng không ạ?...', time: '15:15', unread: true, avatar: 'https://i.pravatar.cc/150?img=2' },
    { id: 3, name: 'hoangha04092', message: 'Xin chào! Món này còn không ...', time: '10:00', unread: true, avatar: 'https://i.pravatar.cc/150?img=3' },
    { id: 4, name: 'lamkien.ct', message: 'Shop còn bán hàng không ạ?...', time: '09:37', unread: true, avatar: 'https://i.pravatar.cc/150?img=4' },
    { id: 5, name: '3j82_uzdplus2be66e_i6hm0i...', message: 'Alo', time: '17/08', unread: false, avatar: 'https://i.pravatar.cc/150?img=5' },
    { id: 6, name: 'hotroshope2265', message: 'Cảm ơn bạn đã quan tâm đến s...', time: '17/08', unread: true, avatar: 'https://i.pravatar.cc/150?img=6' },
  ];

  const messages = [
    { id: 1, sender: 'user', text: 'Xin chào, tôi muốn hỏi về sản phẩm này còn hàng không ạ?', time: '10:05' },
    { id: 2, sender: 'me', text: 'Dạ chào bạn, sản phẩm này shop còn hàng ạ. Bạn có muốn đặt không ạ? 😊', time: '10:07' },
    { id: 3, sender: 'user', text: 'Vâng, tôi muốn đặt 2 cái ạ', time: '10:10' },
    { 
      id: 4, 
      sender: 'user', 
      images: ['https://i.pravatar.cc/300?img=5'], 
      text: 'Mẫu này còn màu xanh không shop?', 
      time: '10:12' 
    },
    { 
      id: 5, 
      sender: 'me', 
      text: 'Dạ shop còn màu xanh ạ! Đây là hình mẫu đó ạ:', 
      images: ['https://i.pravatar.cc/300?img=8'],
      time: '10:15' 
    },
  ];

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Tạo URL cho các hình ảnh đã chọn để hiển thị xem trước
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setSelectedImages([...selectedImages, ...newImages]);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };
  
  const removeImage = (index) => {
    const newImages = [...selectedImages];
    // Giải phóng URL object để tránh rò rỉ bộ nhớ
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };
  
  const handleEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
  };
  
  const handleSendMessage = () => {
    if (message.trim() || selectedImages.length > 0) {
      // Ở đây bạn sẽ gửi tin nhắn và hình ảnh thông qua socket hoặc API
      console.log("Sending message:", message);
      console.log("Sending images:", selectedImages);
      
      // Reset sau khi gửi
      setMessage('');
      setSelectedImages([]);
      setShowEmojiPicker(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar chức năng */}
      <div className="w-16 bg-gray-800 text-white flex flex-col items-center py-4">
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg mb-6">
          <Menu size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Shield size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <BarChart2 size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg relative">
          <Mail size={20} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">97</span>
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Package size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Grid size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <ShoppingCart size={20} />
        </div>
        <div className="cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Settings size={20} />
        </div>
        <div className="mt-auto cursor-pointer p-3 hover:bg-gray-700 rounded-lg">
          <Users size={20} />
        </div>
      </div>
      
      {/* Danh sách chat */}
      <div className="w-96 border-r bg-white overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center">
          <h2 className="font-semibold text-lg">Hội thoại</h2>
          <div className="ml-2 flex items-center bg-gray-100 text-gray-500 rounded-full px-3 py-1 text-sm">
            <span>Shop Coco Kids</span>
            <ChevronDown size={16} className="ml-1" />
          </div>
        </div>
        
        <div className="p-3 border-b">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm kiếm" 
              className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:border-orange-500"
            />
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <button className="absolute right-3 top-2 text-gray-400">
              <ChevronDown size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex px-3 py-2 border-b">
          <div className="flex-1 flex justify-center items-center py-2 text-gray-500 hover:bg-gray-100 cursor-pointer">
            <Mail size={20} className="mr-1" />
          </div>
          <div className="flex-1 flex justify-center items-center py-2 text-gray-500 hover:bg-gray-100 cursor-pointer">
            <Mail size={20} className="mr-1" />
          </div>
          <div className="flex-1 flex justify-center items-center py-2 text-gray-500 hover:bg-gray-100 cursor-pointer">
            <Share size={20} className="mr-1" />
          </div>
          <div className="flex-1 flex justify-center items-center py-2 text-gray-500 hover:bg-gray-100 cursor-pointer">
            <Send size={20} className="mr-1" />
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {contacts.map(contact => (
            <div 
              key={contact.id}
              onClick={() => setActiveChat(contact.id)}
              className={`flex p-3 border-b hover:bg-gray-50 cursor-pointer ${activeChat === contact.id ? 'bg-gray-100' : ''}`}
            >
              <div className="relative">
                <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full" />
                {contact.unread && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">1</span>
                )}
              </div>
              <div className="ml-3 flex-1 overflow-hidden">
                <div className="flex justify-between">
                  <h3 className="font-medium text-sm truncate">{contact.name}</h3>
                  <span className="text-xs text-gray-500">{contact.time}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{contact.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Khu vực chat */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <div className="flex items-center">
                <img src={contacts.find(c => c.id === activeChat)?.avatar} alt="User" className="w-8 h-8 rounded-full" />
                <h2 className="font-semibold ml-2">{contacts.find(c => c.id === activeChat)?.name}</h2>
              </div>
              <div className="flex gap-4">
                <button className="text-gray-500 hover:text-gray-700">
                  <Settings size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {/* Khu vực hiển thị tin nhắn */}
              <div className="max-w mx-8">
                <div className="flex justify-center mb-6">
                  <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">Hôm nay</span>
                </div>
                
                {messages.map(msg => (
                  <div key={msg.id} className={`flex mb-4 ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                    {msg.sender !== 'me' && (
                      <img src={contacts.find(c => c.id === activeChat)?.avatar} alt="User" className="w-8 h-8 rounded-full mr-2" />
                    )}
                    
                    <div className={`p-3 rounded-lg max-w-xs ${msg.sender === 'me' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                      {msg.text && <p className="text-sm mb-2">{msg.text}</p>}
                      
                      {msg.images && msg.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          {msg.images.map((img, idx) => (
                            <img 
                              key={idx} 
                              src={img} 
                              alt="Shared image" 
                              className="rounded-md object-cover w-full h-24" 
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-right mt-1 opacity-75">
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Khu vực hiển thị hình ảnh đã chọn */}
            {selectedImages.length > 0 && (
              <div className="px-4 py-2 border-t bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={image.preview} 
                        alt="Preview" 
                        className="h-16 w-16 object-cover rounded-md border" 
                      />
                      <button 
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Picker cho emoji */}
            {showEmojiPicker && (
              <div className="absolute bottom-16 right-4 z-10">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
            
            {/* Khu vực nhập tin nhắn */}
            <div className="p-3 border-t bg-white">
              <div className="flex items-center">
                <div className="flex space-x-2 mr-2">
                  <button 
                    onClick={triggerFileInput} 
                    className="text-gray-500 hover:text-blue-500 p-2 rounded-full hover:bg-gray-100"
                  >
                    <Image size={20} />
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
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                    className="text-gray-500 hover:text-blue-500 p-2 rounded-full hover:bg-gray-100"
                  >
                    <Smile size={20} />
                  </button>
                </div>
                
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nhập tin nhắn..." 
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                
                <button 
                  onClick={handleSendMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <img src="https://socialintents.b-cdn.net/blog/wp-content/uploads/2021/07/Live-chat-welcome-message.jpg" width={400} height={400} alt="Chào mừng" className="mb-6" />
            <h2 className="text-xl font-semibold mb-2">Chào mừng bạn đến với Ứng dụng Chat Shopee!</h2>
            <p className="text-gray-600 mb-6">Lựa chọn hội thoại từ danh sách để bắt đầu hoạt động bán hàng trên gian hàng Shopee</p>
            
            <div className="border rounded-lg p-3 flex items-center mt-4">
              <MessageSquare className="text-gray-500 mr-2" size={20} />
              <span>Hội thoại</span>
              <span className="mx-3 text-gray-400">|</span>
              <div className="flex items-center text-blue-500">
                <span>Đã chọn gian hàng</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

