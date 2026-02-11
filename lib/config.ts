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
    // Connection timeout: longer in production for serverless cold starts
    connectionTimeout: isProduction ? (isNetlify ? 20000 : 30000) : 10000, // 20s Netlify, 30s Vercel, 10s dev
    // Socket-level timeout (for redis client)
    socketTimeout: isProduction ? (isNetlify ? 20000 : 30000) : 10000,
    // Retry configuration
    maxRetries: isProduction ? (isNetlify ? 2 : 3) : 1, // Fewer retries for Netlify due to timeout limits
    retryDelay: {
      base: isProduction ? (isNetlify ? 500 : 1000) : 500, // Faster retries for Netlify
      max: isProduction ? (isNetlify ? 3000 : 5000) : 2000,
    },
  },
  api: {
    // Progress endpoint timeout
    progressEndpointTimeout: isProduction ? (isNetlify ? 15000 : 20000) : 10000,
  },
  batch: {
    // Netlify Pro: 26s max function timeout (HARD LIMIT - cannot exceed)
    // Processing one page at a time with maximized timeouts
    // Page timeout: 24s (includes page load + AI analysis + DB save)
    // AI analysis timeout: 17s (fits within page timeout)
    // Total per page: ~24s max, leaving 2s buffer for Netlify overhead (DB queries, function startup, etc.)
    // OPTIMIZED: Increased from 22s to 24s to handle slower .com websites while staying within 26s limit
    timeoutPerPage: isProduction && isNetlify ? 24000 : 20000, // 24s for Netlify (maximized), 20s elsewhere
    delayBetweenRequests: 500, // 500ms delay (original)
    aiAnalysisTimeout: isProduction && isNetlify ? 17000 : 20000, // 17s for Netlify (fits in 24s page timeout), 20s elsewhere
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


