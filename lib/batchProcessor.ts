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
  delayBetweenRequests: 1000, // 1 second between requests (sequential processing)
  maxRetries: 3, // Increased retries
  timeoutPerPage: 60000, // 60 seconds for slow pages
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
  config: BatchConfig
): Promise<AuditResult> {
  let lastError: Error | null = null;
  let lastErrorCategory: { type: FailedPage['errorType'], retryable: boolean, message: string } | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Update progress to processing
      await updatePageProgress(jobId, url, 'processing');
      await updateStatus(jobId, 'auditing', url);
      
      // Create timeout promise
      const timeoutPromise = new Promise<AuditResult>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout: Page took longer than ${config.timeoutPerPage}ms`)), config.timeoutPerPage)
      );
      
      // Race between audit and timeout
      const result = await Promise.race([
        auditSinglePage(url),
        timeoutPromise
      ]);
      
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
  const batches = chunkArray(pages, config.batchSize);
  const successful: AuditResult[] = [];
  const failed: FailedPage[] = [];
  
  console.log(`📦 Processing ${pages.length} pages in ${batches.length} batches (${config.batchSize} pages per batch)`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNumber = i + 1;
    
    console.log(`\n🔄 Processing batch ${batchNumber}/${batches.length} (${batch.length} pages)`);
    await updateStatus(jobId, 'auditing', `Batch ${batchNumber}/${batches.length}`);
    
    // Process batch sequentially to avoid browser conflicts and rate limits
    // Sequential processing is more reliable than parallel for browser automation
    const batchResults = [];
    
    for (let index = 0; index < batch.length; index++) {
      const pageUrl = batch[index];
      
      // Add delay between requests (except first)
      if (index > 0) {
        await delay(config.delayBetweenRequests);
      }
      
      try {
        const result = await auditSinglePageWithRetry(pageUrl, jobId, config);
        batchResults.push({ status: 'fulfilled' as const, value: result, url: pageUrl });
      } catch (error: any) {
        batchResults.push({ status: 'rejected' as const, reason: error, url: pageUrl });
      }
    }
    
    // Process results
    batchResults.forEach((result) => {
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
    });
    
    // Delay between batches (except last)
    if (i < batches.length - 1) {
      console.log(`  ⏳ Waiting ${config.delayBetweenBatches}ms before next batch...`);
      await delay(config.delayBetweenBatches);
    }
  }
  
  console.log(`\n✅ Batch processing complete: ${successful.length} successful, ${failed.length} failed`);
  
  return { successful, failed };
}

