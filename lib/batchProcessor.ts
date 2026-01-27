/**
 * Batch Processor
 * Processes pages in batches to avoid timeouts and rate limits
 */

import { AuditResult } from '../types/audit';
import { auditSinglePage } from './auditHelper';
import { updatePageProgress, updateStatus } from './progressTracker';

export interface FailedPage {
  url: string;
  error: string;
  errorType: 'timeout' | 'network' | 'rate_limit' | 'browser' | 'api' | 'unknown';
  retryable: boolean;
}

export interface BatchConfig {
  batchSize: number;
  delayBetweenBatches: number;
  delayBetweenRequests: number;
  maxRetries: number;
  timeoutPerPage: number;
}

const DEFAULT_CONFIG: BatchConfig = {
  batchSize: 3, // Reduced to avoid overwhelming browser/API
  delayBetweenBatches: 12000, // 12 seconds between batches (was 2 seconds)
  delayBetweenRequests: 11000, // 11 seconds between requests (was 1 second)
  maxRetries: 2, // Reduced retries to fail faster and move to next page
  timeoutPerPage: 55000, // 55 seconds per page (was 45 seconds)
};

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Splits array into chunks of specified size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Categorizes an error and determines if it's retryable
 */
function categorizeError(error: any): { type: FailedPage['errorType'], retryable: boolean, message: string } {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorStatus = error?.status;

  // Rate limit errors
  if (errorStatus === 429 || errorMessage.includes('rate limit')) {
    return {
      type: 'rate_limit',
      retryable: true,
      message: 'Rate limit exceeded. Please wait before retrying.',
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('took longer than')) {
    return {
      type: 'timeout',
      retryable: true,
      message: 'Page load timeout. The page took too long to load.',
    };
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('dns') ||
    errorStatus === 503 ||
    errorStatus === 502 ||
    errorStatus === 504
  ) {
    return {
      type: 'network',
      retryable: true,
      message: 'Network error. Unable to reach the website.',
    };
  }

  // Browser errors
  if (
    errorMessage.includes('browser') ||
    errorMessage.includes('chromium') ||
    errorMessage.includes('puppeteer') ||
    errorMessage.includes('executable')
  ) {
    return {
      type: 'browser',
      retryable: false,
      message: 'Browser launch failed. This may be a server configuration issue.',
    };
  }

  // API errors
  if (errorStatus >= 400 && errorStatus < 500 && errorStatus !== 429) {
    return {
      type: 'api',
      retryable: errorStatus >= 500, // Retry on 5xx errors
      message: `API error (${errorStatus}). ${errorMessage || 'Request failed'}`,
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    retryable: true,
    message: error?.message || 'Unknown error occurred',
  };
}

/**
 * Audits a single page with retry logic and timeout
 */
async function auditSinglePageWithRetry(
  url: string,
  jobId: string,
  config: BatchConfig,
  abortSignal?: AbortSignal,
  browserInstance?: any
): Promise<AuditResult> {
  console.log(`[auditSinglePageWithRetry] 🚀 Starting audit for ${url}`);
  console.log(`[auditSinglePageWithRetry] Job ID: ${jobId}`);
  console.log(`[auditSinglePageWithRetry] Max retries: ${config.maxRetries}`);
  console.log(`[auditSinglePageWithRetry] Timeout: ${config.timeoutPerPage}ms`);
  console.log(`[auditSinglePageWithRetry] Abort signal: ${abortSignal ? 'provided' : 'not provided'}`);

  // Create internal abort controller if not provided
  const internalAbortController = abortSignal ? null : new AbortController();
  const signal = abortSignal || internalAbortController!.signal;

  // Set timeout to abort if takes too long
  let abortTimeout: NodeJS.Timeout | null = null;
  if (!abortSignal && internalAbortController) {
    abortTimeout = setTimeout(() => {
      console.error(`[auditSinglePageWithRetry] ⚠️ Aborting audit for ${url} - exceeded timeout`);
      internalAbortController.abort();
    }, config.timeoutPerPage + 15000); // 15 seconds buffer (was 5 seconds)
  }

  let lastError: Error | null = null;
  let lastErrorCategory: { type: FailedPage['errorType'], retryable: boolean, message: string } | null = null;

  try {
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      // Check if aborted
      if (signal.aborted) {
        throw new Error('Audit aborted due to timeout or cancellation');
      }

      console.log(`[auditSinglePageWithRetry] Attempt ${attempt}/${config.maxRetries} for ${url}`);

      try {
        // Update progress to processing
        console.log(`[auditSinglePageWithRetry] Updating progress to 'processing'...`);
        await updatePageProgress(jobId, url, 'processing');
        await updateStatus(jobId, 'auditing', url);
        console.log(`[auditSinglePageWithRetry] ✅ Progress updated`);

        // Create timeout promise
        const timeoutPromise = new Promise<AuditResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: Page took longer than ${config.timeoutPerPage}ms`)), config.timeoutPerPage)
        );

        console.log(`[auditSinglePageWithRetry] Calling auditSinglePage...`);
        const auditStartTime = Date.now();

        // Race between audit and timeout
        const result = await Promise.race([
          auditSinglePage(url, signal, browserInstance),
          timeoutPromise
        ]);

        if (abortTimeout) clearTimeout(abortTimeout);

        const auditDuration = Date.now() - auditStartTime;
        console.log(`[auditSinglePageWithRetry] ✅ Audit completed in ${auditDuration}ms`);

        return result;
      } catch (error: any) {
        lastError = error;
        lastErrorCategory = categorizeError(error);

        console.error(`❌ Attempt ${attempt}/${config.maxRetries} failed for ${url}`);
        console.error(`   Error Type: ${lastErrorCategory.type}`);
        console.error(`   Retryable: ${lastErrorCategory.retryable}`);
        console.error(`   Message: ${lastErrorCategory.message}`);
        console.error(`   Original Error: ${error.message}`);

        // Don't retry if error is not retryable
        if (!lastErrorCategory.retryable && attempt < config.maxRetries) {
          console.log(`   ⚠️ Error is not retryable, skipping remaining attempts`);
          break;
        }

        if (attempt < config.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffDelay = 1000 * Math.pow(2, attempt - 1);
          console.log(`   ⏳ Retrying ${url} in ${backoffDelay}ms...`);
          await delay(backoffDelay);
        } else {
          // Mark as failed after all retries
          try {
            await updatePageProgress(jobId, url, 'failed');
            console.error(`   ❌ All retries exhausted for ${url} - marked as failed`);
          } catch (updateError: any) {
            console.error(`   ❌ CRITICAL: Failed to mark ${url} as failed:`, updateError.message);
            // Try one more time
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
              await updatePageProgress(jobId, url, 'failed');
              console.log(`   ✅ Retry: Marked ${url} as failed`);
            } catch (retryError) {
              console.error(`   ❌ CRITICAL: Retry also failed to mark ${url} as failed`);
            }
          }
        }
      }
    }
  } finally {
    if (abortTimeout) clearTimeout(abortTimeout);
    
    // CRITICAL: Final safety check - if we're exiting with an error and page is still "processing", mark as failed
    if (lastError) {
      try {
        const { getProgress } = await import('./progressTracker');
        const progress = await getProgress(jobId);
        if (progress) {
          const pageResult = progress.pageResults.find(p => p.url === url);
          if (pageResult && pageResult.status === 'processing') {
            console.error(`[auditSinglePageWithRetry] ⚠️ CRITICAL: Page ${url} still in 'processing' state after error - marking as failed`);
            await updatePageProgress(jobId, url, 'failed');
          }
        }
      } catch (finalCheckError: any) {
        console.error(`[auditSinglePageWithRetry] ⚠️ Failed final status check:`, finalCheckError.message);
      }
    }
  }

  // Throw error with categorized information
  const errorWithCategory = lastError || new Error('Max retries exceeded');
  (errorWithCategory as any).category = lastErrorCategory;
  throw errorWithCategory;
}

/**
 * Processes pages in batches with progress tracking
 */
export async function processBatches(
  pages: string[],
  jobId: string,
  config: BatchConfig = DEFAULT_CONFIG
): Promise<{ successful: AuditResult[], failed: FailedPage[] }> {
  console.log(`[processBatches] 🚀 Starting batch processing`);
  console.log(`[processBatches] Job ID: ${jobId}`);
  console.log(`[processBatches] Pages to process: ${pages.length}`);
  console.log(`[processBatches] Environment: ${process.env.VERCEL ? 'VERCEL PRODUCTION' : process.env.NODE_ENV || 'UNKNOWN'}`);
  console.log(`[processBatches] Config:`, JSON.stringify(config, null, 2));

  const batches = chunkArray(pages, config.batchSize);
  const successful: AuditResult[] = [];
  const failed: FailedPage[] = [];

  console.log(`[processBatches] 📦 Processing ${pages.length} pages in ${batches.length} batches (${config.batchSize} pages per batch)`);

  // CRITICAL: Verify we can actually start processing
  console.log(`[processBatches] 🔍 Verifying batch processing can start...`);
  try {
    // Test that we can update status (verifies Redis connection)
    await updateStatus(jobId, 'auditing', 'Verifying batch processing startup...');
    console.log(`[processBatches] ✅ Status update verified - Redis connection OK`);
  } catch (verifyError: any) {
    console.error(`[processBatches] ❌ CRITICAL: Cannot update status - batch processing cannot proceed`);
    console.error(`[processBatches] Error: ${verifyError.message}`);
    throw new Error(`Batch processing startup failed: ${verifyError.message}`);
  }

  // Update status to show we're starting
  try {
    await updateStatus(jobId, 'auditing', 'Starting batch processing...');
    console.log(`[processBatches] ✅ Status updated to 'auditing'`);
  } catch (statusError: any) {
    console.error(`[processBatches] ⚠️ Failed to update status:`, statusError.message);
    // Continue anyway - status update failure shouldn't stop processing
  }

  const batchStartTime = Date.now();

  // Add heartbeat to verify batch processing is running
  const heartbeatInterval = setInterval(() => {
    const elapsed = Date.now() - batchStartTime;
    console.log(`[processBatches] 💓 Heartbeat: Still processing... ${successful.length} completed, ${failed.length} failed (elapsed: ${(elapsed / 1000).toFixed(1)}s)`);
  }, 30000); // Every 30 seconds

  // Initialize browser for the entire batch to improve performance
  let browser: any = null;

  // Check if we're in production environment
  const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

  // Only use shared browser in production to prevent "too many chrome instances" errors
  // In dev, we can still use per-page or shared, but shared is faster
  const useSharedBrowser = true;

  if (useSharedBrowser) {
    try {
      console.log(`[processBatches] 🚀 Launching shared browser for batch processing...`);
      // Dynamically import to avoid circular dependencies if any
      const { launchBrowser } = await import('./auditHelper');
      browser = await launchBrowser();
      console.log(`[processBatches] ✅ Shared browser launched successfully`);
    } catch (error: any) {
      console.error(`[processBatches] ⚠️ Failed to launch shared browser: ${error.message}`);
      console.error(`[processBatches] Will fall back to per-page browser launch`);
    }
  }

  try {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      console.log(`\n[processBatches] 🔄 Processing batch ${batchNumber}/${batches.length} (${batch.length} pages)`);
      console.log(`[processBatches] Batch pages: ${batch.join(', ')}`);

      try {
        await updateStatus(jobId, 'auditing', `Batch ${batchNumber}/${batches.length}`);
      } catch (statusError: any) {
        console.error(`[processBatches] ⚠️ Failed to update status for batch ${batchNumber}:`, statusError.message);
      }

      // Process batch sequentially
      const batchResults = [];

      for (let index = 0; index < batch.length; index++) {
        const pageUrl = batch[index];

        // Add delay between requests (except first)
        if (index > 0) {
          await delay(config.delayBetweenRequests);
        }

        console.log(`[processBatches] 🔍 Starting audit for page ${index + 1}/${batch.length}: ${pageUrl}`);
        const pageStartTime = Date.now();

        // WATCHDOG Timer
        let pageAuditCompleted = false;
        const watchdogTimer = setTimeout(() => {
          if (!pageAuditCompleted) {
            console.error(`[processBatches] ⚠️ WATCHDOG: Page audit for ${pageUrl} is taking longer than expected`);
          }
        }, config.timeoutPerPage + 10000);

        // Declare timeoutId outside try-catch so it's accessible in both
        let timeoutId: NodeJS.Timeout | null = null;
        
        try {
          await updateStatus(jobId, 'auditing', `Auditing page ${index + 1}/${batch.length}: ${pageUrl}`);

          const pageAbortController = new AbortController();
          const abortSignal = pageAbortController.signal;

          // Pass the shared browser instance
          // We need to pass it to auditSinglePageWithRetry, which needs to pass it to auditSinglePage
          const auditPromise = auditSinglePageWithRetry(pageUrl, jobId, config, abortSignal, browser);

          // Timeout handling
          const pageTimeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              console.error(`[processBatches] ⚠️ Page audit timeout - aborting: ${pageUrl}`);
              pageAbortController.abort();
              reject(new Error(`Page audit timeout: ${pageUrl} took longer than ${config.timeoutPerPage}ms`));
            }, config.timeoutPerPage);
          });

          const result = await Promise.race([
            auditPromise.then(r => {
              if (timeoutId) clearTimeout(timeoutId);
              return r;
            }),
            pageTimeoutPromise
          ]);

          pageAuditCompleted = true;
          clearTimeout(watchdogTimer);
          if (timeoutId) clearTimeout(timeoutId);

          const pageDuration = Date.now() - pageStartTime;
          console.log(`[processBatches] ✅ Completed audit for ${pageUrl} in ${pageDuration}ms`);
          batchResults.push({ status: 'fulfilled' as const, value: result, url: pageUrl });
        } catch (error: any) {
          pageAuditCompleted = true;
          clearTimeout(watchdogTimer);
          if (timeoutId) clearTimeout(timeoutId);

          const pageDuration = Date.now() - pageStartTime;
          console.error(`[processBatches] ❌ Failed audit for ${pageUrl} after ${pageDuration}ms`);
          console.error(`[processBatches] Error: ${error.message}`);
          console.error(`[processBatches] Error stack:`, error.stack);
          
          // CRITICAL: Ensure page is marked as failed even if update fails
          try {
            await updatePageProgress(jobId, pageUrl, 'failed');
            console.log(`[processBatches] ✅ Marked ${pageUrl} as failed`);
          } catch (updateError: any) {
            console.error(`[processBatches] ❌ CRITICAL: Failed to mark ${pageUrl} as failed:`, updateError.message);
            // Try one more time after a short delay
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
              await updatePageProgress(jobId, pageUrl, 'failed');
              console.log(`[processBatches] ✅ Retry: Marked ${pageUrl} as failed`);
            } catch (retryError: any) {
              console.error(`[processBatches] ❌ CRITICAL: Retry also failed to mark ${pageUrl} as failed`);
            }
          }

          // If browser crashed or disconnected, try to relaunch for next items
          if (browser && (error.message.includes('Session closed') || error.message.includes('Target closed') || error.message.includes('Protocol error'))) {
            console.warn(`[processBatches] ⚠️ Shared browser issue detected. Relaunching...`);
            try {
              try { await browser.close(); } catch (e) { }
              const { launchBrowser } = await import('./auditHelper');
              browser = await launchBrowser();
              console.log(`[processBatches] ✅ Shared browser relaunched`);
            } catch (relaunchError) {
              console.error(`[processBatches] ❌ Failed to relaunch browser:`, relaunchError);
              browser = null; // Fallback to per-page
            }
          }

          batchResults.push({ status: 'rejected' as const, reason: error, url: pageUrl });
        }
      }

      // Process results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
          await updatePageProgress(jobId, result.url, 'completed', result.value.summary.overallScore);

          // Save full result to KV/Memory for later aggregation
          // Dynamically import to avoid circular dependency issues if any
          try {
            const { savePageResult } = await import('./progressTracker');
            await savePageResult(jobId, result.url, result.value);
          } catch (saveError) {
            console.error(`[processBatches] ⚠️ Failed to save full result for ${result.url}:`, saveError);
          }

        } else {
          const errorCategory = (result.reason as any)?.category || categorizeError(result.reason);
          const failedPage: FailedPage = {
            url: result.url,
            error: errorCategory.message,
            errorType: errorCategory.type,
            retryable: errorCategory.retryable,
          };
          failed.push(failedPage);
          await updatePageProgress(jobId, result.url, 'failed');
        }
      }

      // Delay between batches
      if (i < batches.length - 1) {
        await delay(config.delayBetweenBatches);
      }
    }
  } finally {
    clearInterval(heartbeatInterval);
    // Close shared browser
    if (browser) {
      try {
        console.log(`[processBatches] 🧹 Closing shared browser...`);
        await browser.close();
        console.log(`[processBatches] ✅ Shared browser closed`);
      } catch (e) {
        console.error(`[processBatches] ⚠️ Error closing shared browser:`, e);
      }
    }

    const totalDuration = Date.now() - batchStartTime;
    console.log(`[processBatches] ⏱️ Total batch processing duration: ${totalDuration}ms`);
  }

  console.log(`\n✅ Batch processing complete: ${successful.length} successful, ${failed.length} failed`);
  console.log(`[processBatches] Completion timestamp: ${new Date().toISOString()}`);

  return { successful, failed };
}

