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

// Redis client (uses REDIS_URL for Redis Labs connection)
let kv: any = null;
let useKv = false;
let kvInitialized = false;

// Lazy initialization function - only called when needed
async function initializeKv() {
  if (kvInitialized) {
    return;
  }

    // Skip initialization during build time or static generation
    // But allow initialization at runtime even if RUNTIME is not set (serverless execution)
    if (typeof window === 'undefined') {
      // Check if we're in build phase
      const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                           process.env.NEXT_PHASE === 'phase-development-build';
      
      // In Vercel serverless, we should always initialize (even during build if it's a serverless function)
      // Only skip if we're in actual build phase AND not in Vercel
      if (isBuildPhase && !process.env.VERCEL) {
        console.log('⚠️ Skipping KV initialization during build/static generation');
        kvInitialized = true;
        return;
      }
      
      // If we're in Vercel, always allow initialization (serverless functions need it)
      if (process.env.VERCEL) {
        // This is fine - continue with initialization
      }
    }

  try {
    // First, try Redis Labs connection string (REDIS_URL) - preferred for user's setup
    if (process.env.REDIS_URL) {
      console.log('🔍 Attempting to initialize Redis Labs connection...');
      console.log('   REDIS_URL present:', !!process.env.REDIS_URL);
      console.log('   REDIS_URL length:', process.env.REDIS_URL?.length);
      console.log('   REDIS_URL starts with redis://:', process.env.REDIS_URL?.startsWith('redis://'));
      
      try {
        // Use official redis package as per Vercel's guide
        const { createClient } = require('redis');
        
        // Create Redis client (following Vercel's pattern)
        const redis = createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 10000, // 10 second connection timeout
            reconnectStrategy: (retries: number) => {
              if (retries > 3) {
                console.error(`⚠️ Redis reconnection failed after ${retries} attempts`);
                return false; // Stop retrying
              }
              const delay = Math.min(retries * 50, 2000); // Exponential backoff
              console.log(`   Redis reconnect attempt ${retries}, waiting ${delay}ms...`);
              return delay;
            }
          }
        });
        
        // Add error handlers for better debugging
        redis.on('error', (err: any) => {
          console.error('❌ Redis connection error:', err.message);
          console.error('   Error code:', err.code);
          console.error('   Error stack:', err.stack);
        });
        
        redis.on('connect', () => {
          console.log('✅ Redis connection established');
        });
        
        redis.on('ready', () => {
          console.log('✅ Redis is ready to accept commands');
        });
        
        // Connect lazily on first use
        let connected = false;
        let connectionAttempted = false;
        let connectionError: Error | null = null;
        
        async function ensureConnected() {
          // If already connected, return immediately
          if (connected && redis.isOpen && redis.isReady) {
            return;
          }
          
          // If connection was attempted and failed, allow retry (for serverless environments)
          if (connectionAttempted && connectionError) {
            console.log('🔄 Retrying Redis connection (previous attempt failed)...');
            connectionAttempted = false; // Allow retry
            connectionError = null;
          }
          
          if (!connected && !connectionAttempted) {
            connectionAttempted = true;
            try {
              console.log('🔌 Attempting Redis connection...');
              console.log('   REDIS_URL present:', !!process.env.REDIS_URL);
              
              // Connect using Vercel's pattern: await createClient().connect()
              // Set a connection timeout
              const connectPromise = redis.connect();
              const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout after 10 seconds')), 10000)
              );
              
              await Promise.race([connectPromise, timeoutPromise]);
              connected = true;
              console.log('✅ Redis connected successfully');
              
              // Test connection with a ping
              try {
                const pingResult = await redis.ping();
                console.log('✅ Redis ping successful:', pingResult);
              } catch (pingError: any) {
                console.warn('⚠️ Redis ping failed, but connection seems OK:', pingError.message);
              }
            } catch (err: any) {
              connectionError = err;
              connected = false;
              console.error('❌ Failed to connect to Redis:', err.message);
              console.error('   Error code:', err.code);
              console.error('   Error name:', err.name);
              console.error('   Full error:', err);
              // Don't throw - allow fallback to in-memory storage
              // The error will be logged and the function will continue
            }
          }
          
          // If still not connected after attempt, throw error
          if (!connected && connectionAttempted) {
            throw connectionError || new Error('Redis connection failed');
          }
        }
      
      // Create a compatible interface for Redis operations
      kv = {
        async get(key: string) {
          await ensureConnected();
          const result = await redis.get(key);
          return result;
        },
        async set(key: string, value: string, options?: { ex?: number }) {
          await ensureConnected();
          if (options?.ex) {
            // Redis SETEX: set with expiration in seconds
            return await redis.setEx(key, options.ex, value);
          }
          return await redis.set(key, value);
        },
        async del(key: string) {
          await ensureConnected();
          return await redis.del(key);
        },
        async keys(pattern: string) {
          await ensureConnected();
          return await redis.keys(pattern);
        }
      };
      useKv = true;
      kvInitialized = true;
      console.log('✅ Redis Labs connection initialized (lazy connect enabled)');
      console.log('   Connection will be established on first use');
      console.log('   Using REDIS_URL for persistent storage');
      return;
      } catch (redisError: any) {
        console.error('❌ Failed to initialize Redis:', redisError.message);
        console.error('   Error code:', redisError.code);
        console.error('   Error name:', redisError.name);
        console.error('   Will fall back to in-memory storage');
        kvInitialized = true; // Mark as initialized to prevent retries
        return;
      }
    }
    
    // Check if we're in production and provide helpful guidance
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.error('❌ CRITICAL: REDIS_URL is not configured in production!');
      console.error('   Please set REDIS_URL environment variable in Vercel');
      console.error('   → Go to Vercel Dashboard → Settings → Environment Variables');
      console.error('   → Add REDIS_URL with your Redis Labs connection string');
      console.error('   Example: redis://default:password@host:port');
      console.error('   Progress tracking will NOT persist across serverless invocations without Redis');
    } else {
      console.log('⚠️ REDIS_URL is not set');
      console.log('   Progress tracking will use in-memory storage (may not persist in serverless)');
    }
    kvInitialized = true;
  } catch (e: any) {
    console.log('⚠️ Failed to initialize Redis/KV:', e.message || e);
    console.log('   Will use in-memory storage (may not persist in serverless)');
    kvInitialized = true; // Mark as initialized to prevent retries
  }
}

// Export store reference for debugging
export function getProgressStoreSize(): number {
  return progressStore.size;
}

// Debug function to log store state
export async function debugProgressStore(): Promise<void> {
  // Initialize KV lazily if not already done
  await initializeKv();
  
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
      const kvKey = `audit:progress:${jobId}`;
      const progressJson = JSON.stringify(progress);
      
      console.log(`📝 Storing progress in KV: ${jobId}`);
      console.log(`   KV key: ${kvKey}`);
      console.log(`   Data size: ${progressJson.length} bytes`);
      
      await kv.set(kvKey, progressJson, { ex: 3600 }); // Expire after 1 hour
      console.log(`✅ Stored progress in KV: ${jobId}`);
      
      // Verify it was saved by reading it back
      try {
        const verifyData = await kv.get(kvKey) as string | null;
        if (verifyData) {
          console.log(`✅ Verified progress saved to KV: ${jobId} (${verifyData.length} bytes)`);
        } else {
          console.error(`❌ CRITICAL: Progress not found in KV after save: ${jobId}`);
          console.error(`   This indicates a Redis write issue`);
        }
      } catch (verifyError: any) {
        console.error(`⚠️ Failed to verify KV save:`, verifyError.message);
        // Continue anyway - the save might have succeeded
      }
    } catch (kvError: any) {
      console.error('❌ Failed to store in KV:', kvError.message);
      console.error('   Error code:', kvError.code);
      console.error('   Error name:', kvError.name);
      console.error('   Error stack:', kvError.stack);
      // Even if KV fails, continue with in-memory storage for dev
      console.warn('⚠️ Progress will only be available in current instance (not persistent in serverless)');
    }
  } else {
    // Check if we're in production without Redis/KV
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    if (isProduction) {
      const hasRedisUrl = !!process.env.REDIS_URL;
      
      if (!hasRedisUrl) {
        console.error('❌ CRITICAL: REDIS_URL is not configured in production!');
        console.error('   Progress will NOT persist across serverless invocations');
        console.error('   Please set REDIS_URL environment variable in Vercel');
        console.error('   → Go to Vercel Dashboard → Settings → Environment Variables');
        console.error('   → Add REDIS_URL with your Redis Labs connection string');
      } else {
        console.log('⚠️ REDIS_URL is set but Redis connection not initialized yet');
        console.log('   Connection will be established on first use');
      }
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
  // Initialize KV lazily if not already done
  await initializeKv();
  
  // Get progress (checking both memory and KV)
  let progress = progressStore.get(jobId);
  if (!progress && useKv && kv) {
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
 * Saves progress to KV (helper function to ensure persistence)
 */
async function saveProgressToKv(jobId: string, progress: AuditProgress): Promise<void> {
  if (useKv && kv) {
    try {
      const kvKey = `audit:progress:${jobId}`;
      const progressJson = JSON.stringify(progress);
      await kv.set(kvKey, progressJson, { ex: 3600 });
      console.log(`📝 Saved progress to KV: ${jobId} (status: ${progress.status}, size: ${progressJson.length} bytes)`);
      
      // Verify it was saved
      try {
        const verifyData = await kv.get(kvKey) as string | null;
        if (verifyData) {
          const verifyProgress = JSON.parse(verifyData);
          const hasFinalResult = !!(verifyProgress as any).finalResult;
          console.log(`✅ Verified progress saved to KV: ${jobId}, has finalResult: ${hasFinalResult}`);
        }
      } catch (verifyError: any) {
        console.warn(`⚠️ Failed to verify KV save:`, verifyError.message);
      }
    } catch (kvError: any) {
      console.error('⚠️ Failed to save progress to KV:', kvError.message);
      console.error('   Progress saved in memory only - may not persist across serverless invocations');
    }
  }
}

/**
 * Updates overall status
 */
export async function updateStatus(jobId: string, status: AuditProgress['status'], currentPage?: string): Promise<void> {
  // Initialize KV lazily if not already done
  await initializeKv();
  
  // Get progress (checking both memory and KV)
  // CRITICAL: Check memory first to preserve any finalResult that was just set
  let progress = progressStore.get(jobId);
  if (!progress && useKv && kv) {
    try {
      const kvData = await kv.get(`audit:progress:${jobId}`) as string | null;
      if (kvData) {
        const parsedProgress = JSON.parse(kvData) as AuditProgress;
        if (parsedProgress) {
          progress = parsedProgress;
          progressStore.set(jobId, progress);
        }
      }
    } catch (e) {
      // Ignore KV errors
      console.error('⚠️ Failed to get progress from KV in updateStatus:', e);
    }
  }
  
  // If still no progress, create a minimal one (shouldn't happen, but safety check)
  if (!progress) {
    console.warn(`⚠️ Progress not found for jobId ${jobId} in updateStatus, creating minimal progress`);
    progress = {
      jobId,
      status,
      totalPages: 1,
      completedPages: 0,
      percentage: 0,
      estimatedTimeLeft: 0,
      startTime: Date.now(),
      pageResults: [],
    };
  }
  
  // Preserve finalResult if it exists (don't overwrite it)
  const existingFinalResult = (progress as any).finalResult;
  
  progress.status = status;
  if (currentPage) {
    progress.currentPage = currentPage;
  }
  
  // Restore finalResult if it existed
  if (existingFinalResult) {
    (progress as any).finalResult = existingFinalResult;
  }
  
  // Update in memory FIRST (immediate)
  progressStore.set(jobId, progress);
  
  // Also update in KV if available (persistent storage)
  await saveProgressToKv(jobId, progress);
  
  // Log warning if KV is not available in production
  if (!useKv || !kv) {
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.warn(`⚠️ KV not available - status update saved in memory only for ${jobId}`);
    }
  }
}

/**
 * Saves final result to progress tracker
 * This ensures finalResult is persisted to KV
 */
export async function saveFinalResult(jobId: string, finalResult: any): Promise<void> {
  await initializeKv();
  
  // Get current progress
  let progress = progressStore.get(jobId);
  if (!progress && useKv && kv) {
    try {
      const kvData = await kv.get(`audit:progress:${jobId}`) as string | null;
      if (kvData) {
        progress = JSON.parse(kvData) as AuditProgress;
        progressStore.set(jobId, progress);
      }
    } catch (e) {
      console.error('⚠️ Failed to get progress from KV in saveFinalResult:', e);
    }
  }
  
  if (!progress) {
    console.error(`❌ Cannot save finalResult - progress not found for jobId: ${jobId}`);
    return;
  }
  
  // Set finalResult
  (progress as any).finalResult = finalResult;
  progress.status = 'completed';
  
  // Save to memory
  progressStore.set(jobId, progress);
  
  // Save to KV
  await saveProgressToKv(jobId, progress);
  
  console.log(`✅ Saved finalResult for jobId: ${jobId}`);
  console.log(`   finalResult keys:`, Object.keys(finalResult || {}));
}

/**
 * Gets current progress
 */
export async function getProgress(jobId: string): Promise<AuditProgress | null> {
  // Initialize KV lazily if not already done
  await initializeKv();
  
  console.log(`🔍 Getting progress for jobId: ${jobId}`);
  console.log(`🔍 Progress store size: ${progressStore.size}`);
  console.log(`🔍 All jobIds in store: ${Array.from(progressStore.keys()).join(', ')}`);
  
  // Try in-memory first
  let progress = progressStore.get(jobId);
  
  // If not found and KV is available, try KV
  if (!progress && useKv && kv) {
    try {
      console.log(`🔍 Checking KV for jobId: ${jobId}`);
      const kvKey = `audit:progress:${jobId}`;
      console.log(`   KV key: ${kvKey}`);
      const kvData = await kv.get(kvKey) as string | null;
      if (kvData) {
        console.log(`✅ Found progress in KV: ${jobId}`);
        console.log(`   KV data length: ${kvData.length} bytes`);
        const kvProgress = JSON.parse(kvData);
        // Also store in memory for faster subsequent access
        progressStore.set(jobId, kvProgress);
        progress = kvProgress;
      } else {
        console.log(`❌ No data found in KV for key: ${kvKey}`);
        // Try to list all keys to see what's available
        try {
          const allKeys = await kv.keys('audit:*') as string[];
          console.log(`   Available KV keys (${allKeys.length}):`, allKeys.slice(0, 10));
        } catch (listError: any) {
          console.error('   Failed to list KV keys:', listError.message);
        }
      }
    } catch (kvError: any) {
      console.error('❌ Failed to get from KV:', kvError.message);
      console.error('   Error code:', kvError.code);
      console.error('   Error name:', kvError.name);
      console.error('   Error stack:', kvError.stack);
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
  // Initialize KV lazily if not already done
  await initializeKv();
  
  if (useKv && kv) {
    try {
      const keys = await kv.keys('audit:*') as string[];
      console.log(`[getAllJobs] Found ${keys.length} keys in KV matching 'audit:*'`);
      console.log(`[getAllJobs] Keys:`, keys.slice(0, 10));
      
      // Extract jobId from keys like "audit:progress:jobId"
      const jobIds = keys
        .map((key: string) => {
          // Key format: audit:progress:${jobId}
          if (key.startsWith('audit:progress:')) {
            return key.replace('audit:progress:', '');
          }
          // Fallback: remove 'audit:' prefix (for any other audit:* keys)
          return key.replace('audit:', '');
        })
        .filter((id: string) => id.length > 0); // Filter out empty strings
      
      console.log(`[getAllJobs] Extracted ${jobIds.length} job IDs:`, jobIds.slice(0, 10));
      return jobIds;
    } catch (error: any) {
      console.error('[getAllJobs] Failed to get keys from KV:', error.message);
      console.error('[getAllJobs] Error:', error);
      // Fallback to in-memory store
      return Array.from(progressStore.keys());
    }
  } else {
    console.log(`[getAllJobs] KV not available, using in-memory store (${progressStore.size} jobs)`);
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



