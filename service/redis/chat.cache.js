// redis/chat.cache.js
const { redis } = require('../middleware/cache.middleware');

// Cache TTLs (in seconds)
const CACHE_TTL = {
  MESSAGES: 5 * 60, // 5 phút cho tin nhắn
  UNREAD: 60 * 60, // 1 giờ cho số tin nhắn chưa đọc
  RECENT_MESSAGES: 60 * 2 // 2 phút cho tin nhắn gần đây
};

// Format key cho cache tin nhắn theo conversation, page và limit
const getMessagesKey = (conversationId, page = 1, limit = 20) => 
  `messages:${conversationId}:${page}:${limit}`;

// Format key cho cache unread count
const getUnreadKey = (conversationId, userId) => 
  `unread:${conversationId}:${userId}`;

// Cache module
const chatCache = {
  /**
   * Lấy messages từ cache
   */
  get: async (key) => {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error('[Redis] Error getting data:', error);
      return null;
    }
  },

  /**
   * Lưu messages vào cache
   */
  set: async (key, value, ttlSeconds) => {
    try {
      await redis.set(key, value, 'EX', ttlSeconds || CACHE_TTL.MESSAGES);
      return true;
    } catch (error) {
      console.error('[Redis] Error setting data:', error);
      return false;
    }
  },
   // Phương thức lấy tin nhắn
   getMessages: async (conversationId, page = 1, limit = 20) => {
    try {
      const key = getMessagesKey(conversationId, page, limit);
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Redis] Error getting messages:', error);
      return null;
    }
  },

  // Phương thức lưu tin nhắn
  setMessages: async (conversationId, messages, messagesByDate, pagination, page = 1, limit = 20) => {
    try {
      const key = getMessagesKey(conversationId, page, limit);
      const ttl = page === 1 ? 60 * 2 : CACHE_TTL.MESSAGES; // 2 phút cho trang đầu tiên
      
      const data = {
        messages,
        messagesByDate,
        pagination
      };
      
      await redis.set(key, JSON.stringify(data), 'EX', ttl);
      return true;
    } catch (error) {
      console.error('[Redis] Error setting messages:', error);
      return false;
    }
  },
  /**
   * Tăng unread count
   */
  incrementUnreadCount: async (conversationId, userId) => {
    try {
      const key = getUnreadKey(conversationId, userId);
      await redis.incr(key);
      await redis.expire(key, CACHE_TTL.UNREAD);
      return true;
    } catch (error) {
      console.error('[Redis] Error incrementing unread count:', error);
      return false;
    }
  },

  /**
   * Reset unread count
   */
  resetUnreadCount: async (conversationId, userId) => {
    try {
      const key = getUnreadKey(conversationId, userId);
      await redis.set(key, 0, 'EX', CACHE_TTL.UNREAD);
      return true;
    } catch (error) {
      console.error('[Redis] Error resetting unread count:', error);
      return false;
    }
  },

  /**
   * Lấy unread count
   */
  getUnreadCount: async (conversationId, userId) => {
    try {
      const key = getUnreadKey(conversationId, userId);
      const count = await redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('[Redis] Error getting unread count:', error);
      return 0;
    }
  },

  /**
   * Xóa tất cả tin nhắn cache của một cuộc trò chuyện
   */
  invalidateConversationMessages: async (conversationId) => {
    try {
      // Sử dụng scan để lấy tất cả keys phù hợp
      const pattern = `messages:${conversationId}:*`;
      let cursor = '0';
      let keys = [];
      
      do {
        // Scan lấy keys
        const [nextCursor, scanKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        keys = keys.concat(scanKeys);
      } while (cursor !== '0');
      
      // Xóa các keys tìm được
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      return true;
    } catch (error) {
      console.error('[Redis] Error invalidating conversation messages:', error);
      return false;
    }
  },

  /**
   * Hàm tương thích ngược
   */
  invalidateConversation: async (conversationId) => {
    return await chatCache.invalidateConversationMessages(conversationId);
  }
};

module.exports = chatCache;