import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: (() => {
    const origin = process.env.CORS_ORIGIN
    if (origin) {
      return origin.split(',').map((o) => o.trim())
    }
    return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
  })(),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
}
