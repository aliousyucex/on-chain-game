// Configuration Example
// Copy this file to config.js and fill in your values

module.exports = {
  // Backend Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Blockchain Configuration
  rpcUrl: process.env.RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
  // For testnet: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'

  // Smart Contract
  contractAddress: process.env.CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890',
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || '0xYOUR_ADMIN_PRIVATE_KEY_HERE',

  // Security
  jwtSecret: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-here',
  adminApiKey: process.env.ADMIN_API_KEY || 'your-admin-api-key-for-protected-endpoints',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Gas Configuration
  gasPriceGwei: parseInt(process.env.GAS_PRICE_GWEI) || 20,
  gasLimitBuffer: parseFloat(process.env.GAS_LIMIT_BUFFER) || 1.2,

  // Merkle Tree Configuration
  maxWhitelistSize: parseInt(process.env.MAX_WHITELIST_SIZE) || 10000,
  merkleTreeCacheTtl: parseInt(process.env.MERKLE_TREE_CACHE_TTL) || 3600,

  // Frontend URLs (for CORS)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  allowedOrigins: process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'https://yourdomain.com'],

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFilePath: process.env.LOG_FILE_PATH || 'logs/app.log',

  // Development Only
  debug: process.env.DEBUG === 'true',
  mockBlockchain: process.env.MOCK_BLOCKCHAIN === 'true',

  // Optional Features
  database: {
    url: process.env.DATABASE_URL || null,
    redis: process.env.REDIS_URL || null
  },

  webhooks: {
    secret: process.env.WEBHOOK_SECRET || null,
    depositConfirmation: process.env.DEPOSIT_CONFIRMATION_WEBHOOK_URL || null
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || null,
    discordWebhook: process.env.DISCORD_WEBHOOK_URL || null
  }
};

// Environment Variables to Set:
/*
PORT=3000
NODE_ENV=development
RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
ADMIN_PRIVATE_KEY=0xYOUR_ADMIN_PRIVATE_KEY_HERE
JWT_SECRET=your-super-secure-jwt-secret-key-here
ADMIN_API_KEY=your-admin-api-key-for-protected-endpoints
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
GAS_PRICE_GWEI=20
GAS_LIMIT_BUFFER=1.2
MAX_WHITELIST_SIZE=10000
MERKLE_TREE_CACHE_TTL=3600
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log
DEBUG=true
MOCK_BLOCKCHAIN=false
*/ 