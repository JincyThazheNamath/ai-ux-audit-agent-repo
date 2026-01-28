/**
 * Environment-aware configuration
 * Centralizes all environment-specific settings
 */

export const CONFIG = {
  redis: {
    // Connection timeout: longer in production for serverless cold starts
    connectionTimeout: process.env.VERCEL ? 30000 : 10000, // 30s in production, 10s in dev
    // Socket-level timeout (for redis client)
    socketTimeout: process.env.VERCEL ? 30000 : 10000,
    // Retry configuration
    maxRetries: process.env.VERCEL ? 3 : 1,
    retryDelay: {
      base: process.env.VERCEL ? 1000 : 500, // 1s base delay in production
      max: process.env.VERCEL ? 5000 : 2000, // 5s max delay in production
    },
  },
  api: {
    // Progress endpoint timeout
    progressEndpointTimeout: process.env.VERCEL ? 20000 : 10000,
  },
  logging: {
    level: process.env.VERCEL ? 'info' : 'debug',
  },
};


