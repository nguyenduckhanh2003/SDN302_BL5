/**
 * Redis configuration with environment variable support
 */
module.exports = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: '0',
  
  // Connection settings
  connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '10000'),
  retryStrategy: function (times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Cache TTL defaults (in seconds)
  defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300'), // 5 minutes
  longTTL: parseInt(process.env.REDIS_LONG_TTL || '86400'), // 24 hours
  
  // Cluster configuration (if using Redis Cluster)
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES 
      ? process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port) };
        })
      : [{ host: 'localhost', port: 6379 }]
  }
}; // Dấu này bị thiếu trong code của bạn