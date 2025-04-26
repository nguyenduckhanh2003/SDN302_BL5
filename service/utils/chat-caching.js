/**
 * CHAT CACHING SYSTEM
 * Hệ thống bộ nhớ đệm để tăng tốc truy vấn cho chat
 */

/**
 * Khởi tạo caching cho hệ thống chat
 * @param {object} redisClient - Redis client instance
 * @param {number} defaultTTL - Thời gian mặc định cache tồn tại (giây)
 */
const setupChatCaching = (redisClient, defaultTTL = 900) => {
  if (!redisClient) {
    console.warn('Redis client not provided, chat caching disabled');
    return {
      middleware: (req, res, next) => next(),
      updateCache: () => {},
      invalidateCache: () => {},
      getCached: () => Promise.resolve(null)
    };
  }

  /**
   * Tạo key cho cache
   * @param {string} type - Loại cache (conversation, messages, etc.)
   * @param {string} id - ID đối tượng
   * @param {object} params - Tham số bổ sung (phân trang, filters)
   */
  const createCacheKey = (type, id, params = {}) => {
    let key = `chat:${type}:${id}`;
    
    // Thêm tham số vào key
    if (Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}=${v}`)
        .join(':');
      key += `:${paramString}`;
    }
    
    return key;
  };

  /**
   * Lưu dữ liệu vào cache
   * @param {string} key - Cache key
   * @param {any} data - Dữ liệu cần lưu
   * @param {number} ttl - Thời gian tồn tại (giây)
   */
  const setCache = async (key, data, ttl = defaultTTL) => {
    try {
      await redisClient.setex(
        key,
        ttl,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  };

  /**
   * Lấy dữ liệu từ cache
   * @param {string} key - Cache key
   */
  const getCache = async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  };

  /**
   * Xóa cache dựa trên pattern
   * @param {string} pattern - Pattern để tìm key cần xóa
   */
  const deleteByPattern = async (pattern) => {
    try {
      // Lưu ý: cần thiết lập
      // redis config: notify-keyspace-events Ex
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  };

  // ==== MIDDLEWARE FUNCTIONS ====

  /**
   * Middleware cache cho danh sách hội thoại người dùng
   */
  const conversationListCacheMiddleware = async (req, res, next) => {
    try {
      const userId = req.user._id.toString();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const cacheKey = createCacheKey('conversations', userId, { page, limit });
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        return res.status(200).json({
          success: true,
          data: cachedData.data,
          pagination: cachedData.pagination,
          fromCache: true
        });
      }
      
      // Gắn hàm cập nhật cache vào response để controller sử dụng
      res.updateConversationsCache = (data, pagination) => {
        setCache(cacheKey, { data, pagination });
      };
      
      next();
    } catch (error) {
      // Nếu cache có vấn đề, vẫn tiếp tục xử lý
      console.error('Conversation cache middleware error:', error);
      next();
    }
  };

  /**
   * Middleware cache cho lịch sử tin nhắn của một cuộc hội thoại
   */
  const messageHistoryCacheMiddleware = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      
      // Chỉ cache nếu không phải trang đầu tiên (trang đầu cần luôn mới)
      if (page === 1) {
        return next();
      }
      
      const cacheKey = createCacheKey('messages', conversationId, { page, limit });
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        return res.status(200).json({
          success: true,
          data: cachedData,
          fromCache: true
        });
      }
      
      // Gắn hàm cập nhật cache vào response
      res.updateMessagesCache = (data) => {
        // Cache ngắn hơn cho tin nhắn
        setCache(cacheKey, data, 300); // 5 phút
      };
      
      next();
    } catch (error) {
      console.error('Message history cache middleware error:', error);
      next();
    }
  };

  /**
   * Cập nhật cache sau khi có tin nhắn mới
   * @param {string} conversationId - ID cuộc trò chuyện
   * @param {Array} participantIds - Danh sách ID người tham gia
   */
  const invalidateAfterNewMessage = async (conversationId, participantIds) => {
    try {
      // Xóa cache lịch sử tin nhắn
      await deleteByPattern(`chat:messages:${conversationId}:*`);
      
      // Xóa cache danh sách hội thoại của tất cả người tham gia
      if (Array.isArray(participantIds)) {
        for (const userId of participantIds) {
          await deleteByPattern(`chat:conversations:${userId}:*`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return false;
    }
  };

  /**
   * Cập nhật cache sau khi đánh dấu đã đọc
   * @param {string} conversationId - ID cuộc trò chuyện
   * @param {string} userId - ID người đọc
   */
  const invalidateAfterMarkRead = async (conversationId, userId) => {
    try {
      // Xóa cache danh sách hội thoại của người dùng
      await deleteByPattern(`chat:conversations:${userId}:*`);
      
      // Không cần xóa cache lịch sử tin nhắn vì chỉ thay đổi trạng thái đã đọc
      return true;
    } catch (error) {
      console.error('Cache invalidation after mark read error:', error);
      return false;
    }
  };

  return {
    // Middleware cho các API khác nhau
    conversationListMiddleware: conversationListCacheMiddleware,
    messageHistoryMiddleware: messageHistoryCacheMiddleware,
    
    // Hàm xóa/cập nhật cache
    invalidateAfterNewMessage,
    invalidateAfterMarkRead,
    
    // Hàm trợ giúp
    createCacheKey,
    setCache,
    getCache,
    deleteByPattern
  };
};

module.exports = {
  setupChatCaching
};