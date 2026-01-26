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
  delayBetweenBatches: 2000, // 2 seconds between batches
  delayBetweenRequests: 1000, // 1 second between requests
  maxRetries: 2, // Reduced retries to fail faster and move to next page
  timeoutPerPage: 45000, // 45 seconds per page (reduced to fail faster and move to next page)
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
  abortSignal?: AbortSignal
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
    }, config.timeoutPerPage + 5000); // 5 seconds buffer
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
          auditSinglePage(url, signal),
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
          await updatePageProgress(jobId, url, 'failed');
          console.error(`   ❌ All retries exhausted for ${url}`);
        }
      }
    }
  } finally {
    if (abortTimeout) clearTimeout(abortTimeout);
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
  
  try {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;
      
      console.log(`\n[processBatches] 🔄 Processing batch ${batchNumber}/${batches.length} (${batch.length} pages)`);
      console.log(`[processBatches] Batch pages: ${batch.join(', ')}`);
      console.log(`[processBatches] Timestamp: ${new Date().toISOString()}`);
      
      try {
        await updateStatus(jobId, 'auditing', `Batch ${batchNumber}/${batches.length}`);
        console.log(`[processBatches] ✅ Status updated for batch ${batchNumber}`);
      } catch (statusError: any) {
        console.error(`[processBatches] ⚠️ Failed to update status for batch ${batchNumber}:`, statusError.message);
      }
      
      // Process batch sequentially to avoid browser conflicts and rate limits
      // Sequential processing is more reliable than parallel for browser automation
      const batchResults = [];
      
      for (let index = 0; index < batch.length; index++) {
        const pageUrl = batch[index];
        
        // Add delay between requests (except first)
        if (index > 0) {
          await delay(config.delayBetweenRequests);
        }
        
        console.log(`[processBatches] 🔍 Starting audit for page ${index + 1}/${batch.length}: ${pageUrl}`);
        console.log(`[processBatches] Page start timestamp: ${new Date().toISOString()}`);
        const pageStartTime = Date.now();
        
        // Add a watchdog timer to detect if page audit hangs
        let pageAuditCompleted = false;
        const watchdogTimer = setTimeout(() => {
          if (!pageAuditCompleted) {
            console.error(`[processBatches] ⚠️ WATCHDOG: Page audit for ${pageUrl} is taking longer than expected (${config.timeoutPerPage}ms)`);
            console.error(`[processBatches] ⚠️ This may indicate a hang in browser launch or page navigation`);
          }
        }, config.timeoutPerPage + 10000); // 10 seconds after timeout
        
        try {
          // Special handling for first page of first batch
          if (index === 0 && i === 0) {
            console.log(`[processBatches] 🎯 CRITICAL: Processing FIRST page - adding extra monitoring`);
            console.log(`[processBatches] 🎯 First page URL: ${pageUrl}`);
            console.log(`[processBatches] 🎯 This page must complete or fail within ${config.timeoutPerPage}ms`);
          }
          
          // Update status to show which page we're processing
          await updateStatus(jobId, 'auditing', `Auditing page ${index + 1}/${batch.length}: ${pageUrl}`);
          
          // Create AbortController for this page audit
          const pageAbortController = new AbortController();
          const abortSignal = pageAbortController.signal;
          
          // Wrap auditSinglePageWithRetry in an additional timeout wrapper for extra safety
          const auditPromise = auditSinglePageWithRetry(pageUrl, jobId, config);
          
          // Create timeout that aborts the audit if it takes too long
          let timeoutId: NodeJS.Timeout;
          const pageTimeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              console.error(`[processBatches] ⚠️ Page audit timeout - aborting: ${pageUrl}`);
              pageAbortController.abort();
              reject(new Error(`Page audit timeout: ${pageUrl} took longer than ${config.timeoutPerPage}ms`));
            }, config.timeoutPerPage);
          });
          
          // Clear timeout if audit completes
          const result = await Promise.race([
            auditPromise.then(r => {
              clearTimeout(timeoutId);
              return r;
            }),
            pageTimeoutPromise
          ]);
          pageAuditCompleted = true;
          clearTimeout(watchdogTimer);
          
          const pageDuration = Date.now() - pageStartTime;
          console.log(`[processBatches] ✅ Completed audit for ${pageUrl} in ${pageDuration}ms`);
          console.log(`[processBatches] Page completion timestamp: ${new Date().toISOString()}`);
          batchResults.push({ status: 'fulfilled' as const, value: result, url: pageUrl });
        } catch (error: any) {
          pageAuditCompleted = true;
          clearTimeout(watchdogTimer);
          
          const pageDuration = Date.now() - pageStartTime;
          console.error(`[processBatches] ❌ Failed audit for ${pageUrl} after ${pageDuration}ms`);
          console.error(`[processBatches] Error name: ${error.name}`);
          console.error(`[processBatches] Error message: ${error.message}`);
          console.error(`[processBatches] Error stack: ${error.stack?.split('\n').slice(0, 5).join('\n')}`);
          
          // Check if it's a browser launch error
          if (error.message?.includes('browser') || error.message?.includes('Chromium') || error.message?.includes('executable')) {
            console.error(`[processBatches] ⚠️ Browser launch error detected - this may affect all subsequent pages`);
            console.error(`[processBatches] ⚠️ Consider checking Vercel Chromium configuration`);
          }
          
          // Check if it's a timeout
          if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
            console.error(`[processBatches] ⚠️ Timeout detected - page took too long to process`);
          }
          
          batchResults.push({ status: 'rejected' as const, reason: error, url: pageUrl });
        }
      }
    
    // Process results (using for...of to support async/await)
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
        await updatePageProgress(jobId, result.url, 'completed', result.value.summary.overallScore);
        console.log(`  ✅ ${result.url} - Score: ${result.value.summary.overallScore}`);
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
        console.log(`  ❌ ${result.url} - ${errorCategory.type}: ${errorCategory.message}`);
      }
    }
    
      // Delay between batches (except last)
      if (i < batches.length - 1) {
        console.log(`  ⏳ Waiting ${config.delayBetweenBatches}ms before next batch...`);
        await delay(config.delayBetweenBatches);
      }
    }
  } finally {
    // Clear heartbeat interval
    clearInterval(heartbeatInterval);
    const totalDuration = Date.now() - batchStartTime;
    console.log(`[processBatches] ⏱️ Total batch processing duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
  }
  
  console.log(`\n✅ Batch processing complete: ${successful.length} successful, ${failed.length} failed`);
  console.log(`[processBatches] Completion timestamp: ${new Date().toISOString()}`);
  
  return { successful, failed };
}

