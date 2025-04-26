/**
 * Performance monitoring and metrics for chat functionality
 */
const chatCache = require('../redis/chat.cache');

// Store metrics data
const metrics = {
  sendMessage: {
    count: 0,
    totalTime: 0,
    max: 0
  },
  getHistory: {
    count: 0,
    totalTime: 0,
    max: 0
  },
  getSellerConversations: {
    count: 0,
    totalTime: 0,
    max: 0
  },
  getBuyerConversations: {
    count: 0,
    totalTime: 0,
    max: 0
  },
  getMessages: {
    count: 0,
    totalTime: 0,
    max: 0
  },
  getConversationDetail: {
    count: 0,
    totalTime: 0,
    max: 0
  },
  cacheHits: {
    total: 0,
    byType: {}
  }
};

// Last time metrics were saved
let lastSaveTime = Date.now();

/**
 * Track send message performance
 */
const trackSendMessage = (startTime) => {
  const duration = Date.now() - startTime;
  metrics.sendMessage.count++;
  metrics.sendMessage.totalTime += duration;
  metrics.sendMessage.max = Math.max(metrics.sendMessage.max, duration);
  checkSaveMetrics();
};

/**
 * Track get history performance
 */
const trackGetHistory = (startTime) => {
  const duration = Date.now() - startTime;
  metrics.getHistory.count++;
  metrics.getHistory.totalTime += duration;
  metrics.getHistory.max = Math.max(metrics.getHistory.max, duration);
  checkSaveMetrics();
};

/**
 * Track seller conversations performance
 */
const trackGetSellerConversations = (startTime) => {
  const duration = Date.now() - startTime;
  metrics.getSellerConversations.count++;
  metrics.getSellerConversations.totalTime += duration;
  metrics.getSellerConversations.max = Math.max(metrics.getSellerConversations.max, duration);
  checkSaveMetrics();
};

/**
 * Track buyer conversations performance
 */
const trackGetBuyerConversations = (startTime) => {
  const duration = Date.now() - startTime;
  metrics.getBuyerConversations.count++;
  metrics.getBuyerConversations.totalTime += duration;
  metrics.getBuyerConversations.max = Math.max(metrics.getBuyerConversations.max, duration);
  checkSaveMetrics();
};

/**
 * Track get messages performance
 */
const trackGetMessages = (startTime) => {
  const duration = Date.now() - startTime;
  metrics.getMessages.count++;
  metrics.getMessages.totalTime += duration;
  metrics.getMessages.max = Math.max(metrics.getMessages.max, duration);
  checkSaveMetrics();
};

/**
 * Track conversation detail performance
 */
const trackGetConversationDetail = (startTime) => {
  const duration = Date.now() - startTime;
  metrics.getConversationDetail.count++;
  metrics.getConversationDetail.totalTime += duration;
  metrics.getConversationDetail.max = Math.max(metrics.getConversationDetail.max, duration);
  checkSaveMetrics();
};

/**
 * Track cache hits
 */
const trackCacheHit = (type) => {
  metrics.cacheHits.total++;
  metrics.cacheHits.byType[type] = (metrics.cacheHits.byType[type] || 0) + 1;
  checkSaveMetrics();
};

/**
 * Check if metrics should be saved to Redis
 */
const checkSaveMetrics = () => {
  const now = Date.now();
  // Save metrics every 5 minutes
  if (now - lastSaveTime > 5 * 60 * 1000) {
    saveMetrics();
    lastSaveTime = now;
  }
};

/**
 * Save metrics to Redis
 */
const saveMetrics = async () => {
  try {
    // Add timestamp
    const metricsWithTimestamp = {
      ...metrics,
      timestamp: new Date().toISOString()
    };
    
    // Calculate averages
    Object.keys(metricsWithTimestamp).forEach(key => {
      const metricGroup = metricsWithTimestamp[key];
      if (metricGroup.count && metricGroup.totalTime) {
        metricGroup.average = metricGroup.totalTime / metricGroup.count;
      }
    });
    
    // Reset counters
    resetMetrics();
  } catch (error) {
    console.error('Error saving metrics:', error);
  }
};

/**
 * Reset metrics counters
 */
const resetMetrics = () => {
  Object.keys(metrics).forEach(key => {
    if (key === 'cacheHits') {
      metrics.cacheHits.total = 0;
      metrics.cacheHits.byType = {};
    } else {
      metrics[key].count = 0;
      metrics[key].totalTime = 0;
      metrics[key].max = 0;
    }
  });
};

/**
 * Get current metrics
 */
const getCurrentMetrics = () => {
  const currentMetrics = { ...metrics };
  
  // Calculate averages
  Object.keys(currentMetrics).forEach(key => {
    const metricGroup = currentMetrics[key];
    if (metricGroup.count && metricGroup.totalTime) {
      metricGroup.average = metricGroup.totalTime / metricGroup.count;
    }
  });
  
  return currentMetrics;
};

module.exports = {
  trackSendMessage,
  trackGetHistory,
  trackGetSellerConversations,
  trackGetBuyerConversations, 
  trackGetMessages,
  trackGetConversationDetail,
  trackCacheHit,
  getCurrentMetrics,
  saveMetrics
};