/**
 * Environment-aware configuration
 * Centralizes all environment-specific settings
 */

// Detect deployment platform
const isNetlify = !!process.env.NETLIFY;
const isVercel = process.env.VERCEL === '1';
const isProduction = isNetlify || isVercel || process.env.NODE_ENV === 'production';

export const CONFIG = {
  redis: {
    // Connection timeout: same as dev for all environments
    connectionTimeout: isProduction ? (isNetlify ? 10000 : 30000) : 10000, // 10s Netlify (same as dev), 30s Vercel, 10s dev
    // Socket-level timeout (for redis client)
    socketTimeout: isProduction ? (isNetlify ? 10000 : 30000) : 10000, // 10s Netlify (same as dev), 30s Vercel, 10s dev
    // Retry configuration
    maxRetries: isProduction ? (isNetlify ? 1 : 3) : 1, // Same as dev for Netlify
    retryDelay: {
      base: isProduction ? (isNetlify ? 500 : 1000) : 500, // Same as dev for Netlify
      max: isProduction ? (isNetlify ? 2000 : 5000) : 2000, // Same as dev for Netlify
    },
  },
  api: {
    // Progress endpoint timeout: same as dev for Netlify
    progressEndpointTimeout: isProduction ? (isNetlify ? 10000 : 20000) : 10000, // 10s Netlify (same as dev), 20s Vercel, 10s dev
  },
  batch: {
    // Netlify timeouts match dev environment
    timeoutPerPage: isProduction && isNetlify ? 20000 : 20000, // 20s for Netlify (same as dev), 20s elsewhere
    delayBetweenRequests: 500, // 500ms delay (original)
    aiAnalysisTimeout: isProduction && isNetlify ? 20000 : 20000, // 20s for Netlify (same as dev), 20s elsewhere
    maxRetries: 1, // Single retry
  },
  logging: {
    level: isProduction ? 'info' : 'debug',
  },
  platform: {
    isNetlify,
    isVercel,
    isProduction,
  },
};


