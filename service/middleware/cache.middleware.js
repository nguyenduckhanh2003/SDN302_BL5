// middleware/cache.middleware.js
const Redis = require('ioredis');

// Tạo kết nối Redis với chi tiết cấu hình
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost', // địa chỉ máy chủ Redis
  port: process.env.REDIS_PORT || 6379, // cổng Redis (mặc định: 6379)
  password: process.env.REDIS_PASSWORD || '', // mật khẩu nếu có
  db: 0, // số database (0-15)
  connectTimeout: 10000, // timeout kết nối (ms)
  reconnectOnError: function (err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // chỉ kết nối lại cho lỗi READONLY 
    }
    return false;
  },
  retryStrategy: function (times) {
    const delay = Math.min(times * 100, 3000);
    return delay; // thời gian chờ tăng dần theo số lần thử
  },
  maxRetriesPerRequest: 3 // số lần thử lại tối đa cho mỗi yêu cầu
});

// Xử lý các sự kiện kết nối Redis
redis.on('connect', () => {
  console.log('Redis client connected');
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

redis.on('error', (err) => {
  console.error('Redis client error:', err);
});

redis.on('close', () => {
  console.log('Redis client connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis client reconnecting');
});

// Middleware kiểm tra trạng thái Redis
const redisHealthCheck = (req, res, next) => {
  if (redis.status !== 'ready') {
    console.warn(`Redis connection not ready (current status: ${redis.status}). Some features may be unavailable.`);
  }
  next();
};

module.exports = { redisHealthCheck, redis };