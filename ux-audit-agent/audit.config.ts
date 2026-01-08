/**
 * Standardized Audit Configuration
 * 
 * This configuration ensures consistent audit execution across all environments
 * (local development and production). All audit settings are centralized here
 * and must be strictly followed by both environments.
 * 
 * DO NOT MODIFY THESE VALUES WITHOUT UPDATING BOTH ENVIRONMENTS
 */

export interface AuditConfig {
  browser: {
    headless: 'new' | true | false;
    windowSize: { width: number; height: number };
    viewport: { width: number; height: number; deviceScaleFactor: number };
    launchArgs: string[];
  };
  throttling: {
    throttlingMethod: 'simulate' | 'devtools' | 'provided';
    cpuSlowdownMultiplier: number;
    network: {
      rttMs: number;
      throughputKbps: number;
      downloadThroughput: number;
      uploadThroughput: number;
      latency: number;
      connectionType: 'none' | 'cellular2g' | 'cellular3g' | 'cellular4g' | 'bluetooth' | 'ethernet' | 'wifi' | 'wimax' | 'other' | string;
    };
    mode: string;
  };
  pageLoad: {
    waitUntil: string;
    timeout: number;
    stabilizationPeriod: number;
  };
  warmup: {
    enabled: boolean;
    waitUntil: string;
    timeout: number;
    cooldownPeriod: number;
  };
  cacheClearing: {
    clearStorageCache: boolean;
    clearBrowserCookies: boolean;
  };
  metrics: {
    topMetrics: string[];
    thresholds: {
      lcp: { good: number; needsImprovement: number };
      fcp: { good: number; needsImprovement: number };
      tbt: { good: number; needsImprovement: number };
      cls: { good: number; needsImprovement: number };
      si: { good: number; needsImprovement: number };
      tti: { good: number; needsImprovement: number };
    };
    normalization: {
      timeRounding: number;
      clsPrecision: number;
    };
  };
  ai: {
    temperature: number;
    preferredModel: string;
    fallbackModels: string[];
    maxTokens: number;
  };
  environment: {
    productionIdentifiers: string[];
    getCurrent: () => 'production' | 'development';
  };
  productionFactors: {
    [key: string]: { note: string; impact: string };
  };
  logging: {
    enableMetricLogging: boolean;
    logRawMetrics: boolean;
    logSystemFingerprint: boolean;
    logEnvironmentFactors: boolean;
  };
}

// Runtime evaluation of environment variables
const getPreferredModel = () => {
  return process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
};

export const auditConfig: AuditConfig = {
  // Browser Configuration - Ensures consistent browser behavior
  browser: {
    // Use new headless mode for better compatibility
    headless: 'new',
    
    // Fixed window size for consistent layout analysis
    windowSize: {
      width: 1280,
      height: 800,
    },
    
    // Standardized viewport for consistent metric collection
    viewport: {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
    },
    
    // Browser launch arguments - MUST be identical across environments
    launchArgs: [
      '--headless=new',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-domain-reliability',
      '--disable-extensions',
      '--disable-features=TranslateUI',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--disable-web-resources',
      '--enable-automation',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain',
      // CRITICAL: Disable disk caching entirely to ensure consistent measurements
      '--disk-cache-size=1',
    ],
  },

  // Throttling Configuration - SIMULATED (not observed) for consistency
  // These values match Lighthouse's simulated throttling
  throttling: {
    // CRITICAL: Force simulated throttling (not observed)
    // This ensures consistent metrics regardless of host machine performance
    throttlingMethod: 'simulate',
    
    // CPU Throttling: Fixed 4x slowdown (matches Lighthouse)
    // This is SIMULATED, not actual CPU throttling
    cpuSlowdownMultiplier: 4,
    
    // Network Throttling: SIMULATED (matches Lighthouse desktop/mobile)
    // Fixed values ensure consistent measurements
    network: {
      // Round trip time (ms) - Fixed at 150ms
      rttMs: 150,
      
      // Throughput (Kbps) - Fixed at 1638 Kbps (matches standard desktop)
      throughputKbps: 1638,
      
      // Download throughput (bytes/sec) - Calculated from throughputKbps
      downloadThroughput: 1638 * 1024 / 8, // 1638 Kbps = 209664 bytes/sec
      
      // Upload throughput (bytes/sec) - Typically 60% of download
      uploadThroughput: Math.round(1638 * 1024 / 8 * 0.6), // ~125798 bytes/sec
      
      // Latency (ms) - Same as rttMs
      latency: 150,
      
      // Connection type for simulation
      connectionType: '4g',
    },
    
    // IMPORTANT: Use 'simulate' mode, not 'native' or 'custom'
    // This ensures consistent results regardless of host machine performance
    mode: 'simulate',
  },

  // Page Load Configuration
  pageLoad: {
    // Wait strategy - CRITICAL: networkidle0 ensures audit only starts when
    // there have been no network connections for at least 500ms
    // This is stricter than networkidle2 (2 or fewer connections) and ensures
    // all resources are fully loaded before audit begins
    // Applies to both production and development environments
    waitUntil: 'networkidle0',
    
    // Timeout in milliseconds
    timeout: 30000,
    
    // Stabilization period after page load (ms)
    // This ensures metrics are collected at the same point in page lifecycle
    stabilizationPeriod: 3000,
  },

  // Warm-up Request Configuration
  // CRITICAL: Warm-up request ensures server-side cache and DNS are 'hot' before audit
  // This applies to both production and development environments
  warmup: {
    // Enable warm-up request before actual audit
    enabled: true,
    
    // Warm-up wait strategy - just need to establish connection and load DOM
    // Use 'domcontentloaded' for faster warm-up (don't wait for all resources)
    waitUntil: 'domcontentloaded',
    
    // Warm-up timeout (ms) - shorter than actual audit since we just need connection
    timeout: 10000,
    
    // Wait period after warm-up before starting actual audit (ms)
    // This ensures DNS/cache are fully warmed
    cooldownPeriod: 1000,
  },

  // Cache and Cookie Clearing Configuration
  // CRITICAL: These must be set to true before every run for consistent measurements
  cacheClearing: {
    // Clear storage cache before every audit run
    // This ensures consistent measurements by eliminating storage cache effects
    clearStorageCache: true,
    
    // Clear browser cookies before every audit run
    // This ensures consistent measurements by eliminating cookie effects
    clearBrowserCookies: true,
  },

  // Performance Metrics Configuration
  metrics: {
    // Top 5 Core Web Vitals and Performance Metrics to log
    topMetrics: [
      'LCP',  // Largest Contentful Paint
      'TBT',  // Total Blocking Time
      'CLS',  // Cumulative Layout Shift
      'FCP',  // First Contentful Paint
      'SI',   // Speed Index
    ],
    
    // Metric thresholds (Lighthouse-style)
    thresholds: {
      lcp: { good: 2500, needsImprovement: 4000 },
      fcp: { good: 1800, needsImprovement: 3000 },
      tbt: { good: 200, needsImprovement: 600 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      si: { good: 3400, needsImprovement: 5800 },
      tti: { good: 3800, needsImprovement: 7300 },
    },
    
    // Normalization settings
    normalization: {
      // Round time metrics to nearest 10ms to eliminate floating-point variance
      timeRounding: 10,
      // Round CLS to 3 decimal places
      clsPrecision: 3,
    },
  },

  // AI Configuration
  ai: {
    // Temperature: 0.0 for deterministic responses
    temperature: 0.0,
    
    // Model preferences (fallback chain) - evaluated at runtime
    preferredModel: getPreferredModel(),
    fallbackModels: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    
    // Max tokens for AI response
    maxTokens: 4000,
  },

  // Environment Detection
  environment: {
    // Production identifiers
    productionIdentifiers: ['VERCEL', 'production'],
    
    // Get current environment
    getCurrent: () => {
      return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
        ? 'production'
        : 'development';
    },
  },

  // Production-Only Factors to Consider
  // These may affect metrics but are outside our control
  productionFactors: {
    // CDN caching (Cloudflare, Vercel Edge, etc.)
    cdn: {
      note: 'CDN caching may speed up asset delivery in production',
      impact: 'May improve LCP, FCP, Speed Index',
    },
    
    // Asset minification/optimization
    optimization: {
      note: 'Production builds often have minified assets',
      impact: 'May improve TBT, TTI due to smaller bundle sizes',
    },
    
    // Authentication redirects
    authRedirects: {
      note: 'Some production sites may have auth redirects',
      impact: 'May increase FCP, LCP if redirects occur',
    },
    
    // Geographic location
    geolocation: {
      note: 'Server location vs user location affects network latency',
      impact: 'May affect all network-dependent metrics',
    },
    
    // DNS resolution
    dns: {
      note: 'Production DNS may differ from local',
      impact: 'Minimal impact on metrics',
    },
  },

  // Logging Configuration
  logging: {
    // Enable detailed metric logging
    enableMetricLogging: true,
    
    // Log raw metric values
    logRawMetrics: true,
    
    // Log system fingerprint
    logSystemFingerprint: true,
    
    // Log environment differences
    logEnvironmentFactors: true,
  },
};

