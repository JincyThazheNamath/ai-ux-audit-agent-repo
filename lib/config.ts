/**
 * Environment-aware configuration
 * Centralizes all environment-specific settings
 */

export const CONFIG = {
  redis: {
    // Connection timeout: longer in production for serverless cold starts
    connectionTimeout: process.env.VERCEL ? 40000 : 20000, // 40s in production (was 30s), 20s in dev (was 10s)
    // Socket-level timeout (for redis client)
    socketTimeout: process.env.VERCEL ? 40000 : 20000, // 40s in production (was 30s), 20s in dev (was 10s)
    // Retry configuration
    maxRetries: process.env.VERCEL ? 3 : 1,
    retryDelay: {
      base: process.env.VERCEL ? 11000 : 10500, // 11s base delay in production (was 1s), 10.5s in dev (was 500ms)
      max: process.env.VERCEL ? 15000 : 12000, // 15s max delay in production (was 5s), 12s in dev (was 2s)
    },
  },
  api: {
    // Progress endpoint timeout
    progressEndpointTimeout: process.env.VERCEL ? 30000 : 20000, // 30s production (was 20s), 20s dev (was 10s)
  },
  logging: {
    level: process.env.VERCEL ? 'info' : 'debug',
  },
};


