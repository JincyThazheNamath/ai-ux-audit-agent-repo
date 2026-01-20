/**
 * Progress Tracker
 * Manages audit progress and ETA calculations
 */

export interface AuditProgress {
  jobId: string;
  status: 'discovering' | 'auditing' | 'aggregating' | 'completed' | 'failed';
  totalPages: number;
  completedPages: number;
  currentPage?: string;
  percentage: number;
  estimatedTimeLeft: number; // in seconds
  startTime: number;
  pageResults: Array<{
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    score?: number;
    startTime?: number; // When page audit started
    endTime?: number; // When page audit completed
    duration?: number; // Duration in milliseconds
  }>;
  // Enhanced timing data for better estimation
  averagePageDuration?: number; // Average time per page in milliseconds
  recentPageDurations?: number[]; // Last 5 page durations for trend analysis
}

// In-memory storage for progress (in production, use Redis or database)
// Using a global Map to ensure persistence across requests in dev mode
// NOTE: In serverless environments (Vercel), this will be cleared between requests
// For production, use Redis or a database
// Using globalThis to ensure the Map persists across hot reloads in Next.js dev mode
const globalForProgressStore = globalThis as unknown as {
  progressStore: Map<string, AuditProgress> | undefined;
};

if (!globalForProgressStore.progressStore) {
  globalForProgressStore.progressStore = new Map<string, AuditProgress>();
  console.log('📦 Initialized global progressStore');
}

const progressStore = globalForProgressStore.progressStore;

// Check if we're in Vercel production environment
const isVercelProduction = process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';

// Redis/KV client (supports both Vercel KV REST API and Redis Labs connection string)
let kv: any = null;
let useKv = false;

try {
  // First, try Vercel KV REST API format (preferred)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv || kvModule.default || kvModule;
    useKv = true;
    console.log('✅ Vercel KV initialized (REST API) for persistent storage');
  }
  // Second, try Redis Labs connection string (REDIS_URL)
  else if (process.env.REDIS_URL) {
    // Dynamic import to avoid requiring ioredis if not needed
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000); // Exponential backoff
      }
    });
    
    // Create a compatible interface that matches @vercel/kv API
    kv = {
      async get(key: string) {
        const result = await redis.get(key);
        return result;
      },
      async set(key: string, value: string, options?: { ex?: number }) {
        if (options?.ex) {
          // Redis SETEX: set with expiration in seconds
          return await redis.setex(key, options.ex, value);
        }
        return await redis.set(key, value);
      },
      async del(key: string) {
        return await redis.del(key);
      },
      async keys(pattern: string) {
        return await redis.keys(pattern);
      }
    };
    useKv = true;
    console.log('✅ Redis Labs connection initialized for persistent storage');
  } else {
    console.log('⚠️ Neither KV_REST_API_URL nor REDIS_URL is set');
    console.log('   Progress tracking will use in-memory storage (may not persist in serverless)');
  }
} catch (e: any) {
  console.log('⚠️ Failed to initialize Redis/KV:', e.message || e);
  console.log('   Will use in-memory storage (may not persist in serverless)');
}

// Export store reference for debugging
export function getProgressStoreSize(): number {
  return progressStore.size;
}

// Debug function to log store state
export async function debugProgressStore(): Promise<void> {
  if (useKv && kv) {
    const allKeys = await kv.keys('audit:*') as string[];
    console.log('📊 Progress Store Debug (KV):');
    console.log('   Total jobs:', allKeys.length);
    console.log('   Job IDs:', allKeys.map((k: string) => k.replace('audit:', '')));
    for (const key of allKeys) {
      const jobId = key.replace('audit:', '');
      const progress = await getProgress(jobId);
      if (progress) {
        console.log(`   - ${jobId}: ${progress.status} (${progress.completedPages}/${progress.totalPages})`);
      }
    }
  } else {
    console.log('📊 Progress Store Debug (in-memory):');
    console.log('   Total jobs:', progressStore.size);
    console.log('   Job IDs:', Array.from(progressStore.keys()));
    progressStore.forEach((progress, jobId) => {
      console.log(`   - ${jobId}: ${progress.status} (${progress.completedPages}/${progress.totalPages})`);
    });
  }
}

/**
 * Creates a new progress tracker
 */
export async function createProgressTracker(jobId: string, totalPages: number): Promise<AuditProgress> {
  const progress: AuditProgress = {
    jobId,
    status: 'discovering',
    totalPages,
    completedPages: 0,
    percentage: 0,
    estimatedTimeLeft: 0,
    startTime: Date.now(),
    pageResults: [],
  };
  
  // In serverless environments, KV is required for persistence
  // If KV is not available, we should still try to store in memory
  // but warn that it may not persist across invocations
  
  // Store in memory (for dev/local)
  progressStore.set(jobId, progress);
  
  // CRITICAL: Store in KV if available (required for serverless persistence)
  if (useKv && kv) {
    try {
      await kv.set(`audit:progress:${jobId}`, JSON.stringify(progress), { ex: 3600 }); // Expire after 1 hour
      console.log(`📝 Stored progress in KV: ${jobId}`);
    } catch (kvError: any) {
      console.error('⚠️ Failed to store in KV:', kvError.message);
      // Even if KV fails, continue with in-memory storage for dev
      console.warn('⚠️ Progress will only be available in current instance (not persistent in serverless)');
    }
  } else {
    // Check if we're in production without KV
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.error('❌ CRITICAL: Vercel KV not configured in production!');
      console.error('   Progress will NOT persist across serverless invocations');
      console.error('   Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables');
      console.error('   See VERCEL_KV_SETUP.md for instructions');
    }
  }
  
  console.log(`📝 Created progress tracker: ${jobId}, totalPages: ${totalPages}`);
  console.log(`📝 Progress store size: ${progressStore.size}`);
  console.log(`📝 Store keys: ${Array.from(progressStore.keys()).join(', ')}`);
  console.log(`📝 KV enabled: ${useKv && kv ? 'YES' : 'NO'}`);
  
  // Verify it was stored
  const stored = progressStore.get(jobId);
  if (!stored) {
    console.error(`❌ CRITICAL: Job ${jobId} was not stored in progressStore!`);
  } else {
    console.log(`✅ Verified job ${jobId} is in store`);
  }
  
  return progress;
}

/**
 * Updates progress for a specific page
 */
export async function updatePageProgress(
  jobId: string,
  pageUrl: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  score?: number
): Promise<void> {
  // Get progress (checking both memory and KV)
  let progress = progressStore.get(jobId);
  if (!progress && kv) {
    try {
      progress = await kv.get(`audit:progress:${jobId}`);
      if (progress) {
        progressStore.set(jobId, progress);
      }
    } catch (e) {
      // Ignore KV errors
    }
  }
  if (!progress) return;
  
  const pageIndex = progress.pageResults.findIndex(p => p.url === pageUrl);
  const now = Date.now();
  
  if (pageIndex >= 0) {
    const pageResult = progress.pageResults[pageIndex];
    const previousStatus = pageResult.status;
    
    // Track timing
    if (status === 'processing' && previousStatus !== 'processing') {
      // Page just started processing
      pageResult.startTime = now;
    } else if ((status === 'completed' || status === 'failed') && previousStatus === 'processing') {
      // Page just finished
      pageResult.endTime = now;
      if (pageResult.startTime) {
        pageResult.duration = now - pageResult.startTime;
        
        // Update timing statistics for better estimation
        if (status === 'completed' && pageResult.duration) {
          // Track recent durations (last 5 completed pages)
          if (!progress.recentPageDurations) {
            progress.recentPageDurations = [];
          }
          progress.recentPageDurations.push(pageResult.duration);
          
          // Keep only last 5 durations
          if (progress.recentPageDurations.length > 5) {
            progress.recentPageDurations.shift();
          }
          
          // Calculate average duration
          const completedPages = progress.pageResults.filter(p => p.status === 'completed' && p.duration);
          if (completedPages.length > 0) {
            const totalDuration = completedPages.reduce((sum, p) => sum + (p.duration || 0), 0);
            progress.averagePageDuration = totalDuration / completedPages.length;
          }
        }
      }
    }
    
    pageResult.status = status;
    if (score !== undefined) {
      pageResult.score = score;
    }
  } else {
    // New page
    const newPageResult: any = { url: pageUrl, status, score };
    if (status === 'processing') {
      newPageResult.startTime = now;
    }
    progress.pageResults.push(newPageResult);
  }
  
  // Update completed count
  progress.completedPages = progress.pageResults.filter(p => p.status === 'completed').length;
  progress.percentage = Math.round((progress.completedPages / progress.totalPages) * 100);
  
  // Calculate estimated time left with improved algorithm
  const remainingPages = progress.totalPages - progress.completedPages;
  
  if (remainingPages > 0 && progress.completedPages > 0) {
    // Use recent durations if available (more accurate for trend)
    let estimatedMsPerPage: number;
    
    if (progress.recentPageDurations && progress.recentPageDurations.length >= 2) {
      // Use weighted average: recent pages weighted more heavily
      const recentAvg = progress.recentPageDurations.reduce((sum, d) => sum + d, 0) / progress.recentPageDurations.length;
      const overallAvg = progress.averagePageDuration || recentAvg;
      
      // Weight: 70% recent average, 30% overall average
      estimatedMsPerPage = (recentAvg * 0.7) + (overallAvg * 0.3);
    } else if (progress.averagePageDuration) {
      // Use overall average if available
      estimatedMsPerPage = progress.averagePageDuration;
    } else {
      // Fallback: use elapsed time average
      const elapsed = Date.now() - progress.startTime;
      estimatedMsPerPage = elapsed / progress.completedPages;
    }
    
    // Add buffer for processing overhead (10%)
    estimatedMsPerPage = estimatedMsPerPage * 1.1;
    
    // Calculate estimated time left
    progress.estimatedTimeLeft = Math.round((estimatedMsPerPage * remainingPages) / 1000); // Convert to seconds
  } else {
    progress.estimatedTimeLeft = 0;
  }
  
  progressStore.set(jobId, progress);
}

/**
 * Updates overall status
 */
export async function updateStatus(jobId: string, status: AuditProgress['status'], currentPage?: string): Promise<void> {
  // Get progress (checking both memory and KV)
  let progress = progressStore.get(jobId);
  if (!progress && kv) {
    try {
      progress = await kv.get(`audit:progress:${jobId}`);
      if (progress) {
        progressStore.set(jobId, progress);
      }
    } catch (e) {
      // Ignore KV errors
    }
  }
  if (!progress) return;
  
  progress.status = status;
  if (currentPage) {
    progress.currentPage = currentPage;
  }
  
  // Update in memory
  progressStore.set(jobId, progress);
  
  // Also update in KV if available
  if (useKv && kv) {
    try {
      await kv.set(`audit:progress:${jobId}`, JSON.stringify(progress), { ex: 3600 });
    } catch (kvError: any) {
      console.error('⚠️ Failed to update KV:', kvError.message);
    }
  }
}

/**
 * Gets current progress
 */
export async function getProgress(jobId: string): Promise<AuditProgress | null> {
  console.log(`🔍 Getting progress for jobId: ${jobId}`);
  console.log(`🔍 Progress store size: ${progressStore.size}`);
  console.log(`🔍 All jobIds in store: ${Array.from(progressStore.keys()).join(', ')}`);
  
  // Try in-memory first
  let progress = progressStore.get(jobId);
  
  // If not found and KV is available, try KV
  if (!progress && useKv && kv) {
    try {
      const kvData = await kv.get(`audit:progress:${jobId}`) as string | null;
      if (kvData) {
        const kvProgress = JSON.parse(kvData);
        console.log(`✅ Found progress in KV: ${jobId}`);
        // Also store in memory for faster subsequent access
        progressStore.set(jobId, kvProgress);
        progress = kvProgress;
      }
    } catch (kvError: any) {
      console.error('⚠️ Failed to get from KV:', kvError.message);
    }
  }
  
  if (!progress) {
    console.log(`❌ Progress not found for jobId: ${jobId}`);
    console.log(`   Available jobIds: ${Array.from(progressStore.keys()).join(', ')}`);
    console.log(`   JobId match check: ${Array.from(progressStore.keys()).map(k => `"${k}" === "${jobId}": ${k === jobId}`).join(', ')}`);
  } else {
    console.log(`✅ Found progress for jobId: ${jobId}, status: ${progress.status}`);
  }
  return progress || null;
}

/**
 * Gets all active jobs (for debugging)
 */
export async function getAllJobs(): Promise<string[]> {
  if (useKv && kv) {
    const keys = await kv.keys('audit:*') as string[];
    return keys.map((key: string) => key.replace('audit:', ''));
  } else {
    return Array.from(progressStore.keys());
  }
}

/**
 * Formats estimated time left as human-readable string
 */
export function formatTimeLeft(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Cleans up old progress data (older than 1 hour)
 */
export function cleanupOldProgress(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [jobId, progress] of progressStore.entries()) {
    if (progress.startTime < oneHourAgo && progress.status === 'completed') {
      progressStore.delete(jobId);
    }
  }
}



