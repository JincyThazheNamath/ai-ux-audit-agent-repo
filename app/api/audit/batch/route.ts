import { NextRequest, NextResponse } from 'next/server';
import { getProgress, updateStatus, updatePageProgress, saveFinalResult } from '../../../../lib/progressTracker';
import { processBatches } from '../../../../lib/batchProcessor';
import { aggregateAuditResults, sortPagesBySeverity } from '../../../../lib/batchAuditor';

// Vercel serverless function configuration
// Serverless function configuration
// Netlify Pro: 26s timeout max
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const functionStartTime = Date.now();
    try {
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        console.log(`[Batch] 🚀 Processing batch for Job ID: ${jobId} (start: ${new Date().toISOString()})`);

        // 1. Get current progress
        const progressStartTime = Date.now();
        const progress = await getProgress(jobId);
        const progressDuration = Date.now() - progressStartTime;
        console.log(`[Batch] ⏱️ Progress fetch: ${progressDuration}ms`);
        
        if (!progress) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // 2. Identify pending pages
        const pendingPages = progress.pageResults
            .filter(p => p.status === 'pending')
            .map(p => p.url);

        if (pendingPages.length === 0) {
            console.log(`[Batch] ✅ No pending pages. Job completed.`);

            if (progress.status !== 'completed') {
                await updateStatus(jobId, 'completed');
            }

            return NextResponse.json({ status: 'completed', message: 'All pages processed' });
        }

        // 3. Define Batch Size - OPTIMIZED for Netlify 26s limit
        // Process only 1 page per batch to allow 20s timeout per page
        // Each page: ~15-20s max (page load + AI analysis + DB save)
        // 1 page × 20s = 20s max, leaving 6s buffer for overhead
        const BATCH_SIZE = 1; // Reduced to 1 page per batch to allow 20s timeout per page
        
        // Double-check that pages are still pending before processing
        // This prevents re-auditing completed pages
        const verifiedPendingPages = pendingPages.filter(url => {
          const pageStatus = progress.pageResults.find(p => p.url === url)?.status;
          if (pageStatus !== 'pending') {
            console.log(`[Batch] ⚠️ Skipping ${url} - status is ${pageStatus}, not pending`);
            return false;
          }
          return true;
        });

        if (verifiedPendingPages.length === 0) {
          console.log(`[Batch] ✅ No verified pending pages after filtering. Job completed.`);
          if (progress.status !== 'completed') {
            await updateStatus(jobId, 'completed');
          }
          return NextResponse.json({ status: 'completed', message: 'All pages processed' });
        }
        
        const currentBatchUrls = verifiedPendingPages.slice(0, BATCH_SIZE);
        const totalBatches = Math.ceil(verifiedPendingPages.length / BATCH_SIZE);
        const currentBatchNumber = Math.ceil((progress.totalPages - verifiedPendingPages.length) / BATCH_SIZE) + 1;

        console.log(`[Batch] 📦 Batch ${currentBatchNumber}/${totalBatches}: Processing ${currentBatchUrls.length} pages`);
        console.log(`[Batch]    URLs: ${currentBatchUrls.join(', ')}`);

        // 4. Process this batch with optimized timeouts
        const batchStartTime = Date.now();
        try {
            await processBatches(currentBatchUrls, jobId, {
                batchSize: BATCH_SIZE,
                delayBetweenBatches: 0, // No delay needed - we're processing one small batch
                delayBetweenRequests: 500, // Reduced from 1000ms to 500ms for faster processing
                maxRetries: 1, // Single retry to fail fast
                timeoutPerPage: 20000 // Increased to 20s per page for better success rate
            });
        } catch (err: any) {
            console.error(`[Batch] ⚠️ Batch processing error: ${err.message}`);
        }
        
        const batchDuration = Date.now() - batchStartTime;
        console.log(`[Batch] ⏱️ Batch processing duration: ${batchDuration}ms`);

        // 5. Re-check progress to get accurate remaining count
        const updatedProgress = await getProgress(jobId);
        const remainingPendingPages = updatedProgress 
            ? updatedProgress.pageResults
                .filter(p => p.status === 'pending')
                .map(p => p.url)
                .filter(url => {
                  // Double-check status to ensure we don't include completed pages
                  const pageStatus = updatedProgress.pageResults.find(p => p.url === url)?.status;
                  return pageStatus === 'pending';
                })
            : [];

        // 6. Recursive Call or Finalization
        if (remainingPendingPages.length > 0) {
            const nextBatchNumber = currentBatchNumber + 1;
            console.log(`[Batch] 🔄 Triggering batch ${nextBatchNumber}/${totalBatches} (${remainingPendingPages.length} pages remaining)`);

            const origin = new URL(request.url).origin;
            const nextBatchUrl = `${origin}/api/audit/batch`;

            console.log(`[Batch] 🔗 Next batch URL: ${nextBatchUrl}`);

            // Trigger next batch asynchronously (don't wait for it)
            try {
                fetch(nextBatchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jobId })
                }).catch(e => console.error(`[Batch] ❌ Failed to trigger next batch: ${e.message}`));

            } catch (e) {
                console.error(`[Batch] ❌ Error initiating next batch:`, e);
            }
        } else {
            // No more pages, we are done
            console.log(`[Batch] ✅ Final batch completed.`);

            // Trigger final aggregation
            try {
                const { getAllPageResults } = await import('../../../../lib/progressTracker');
                const allResults = await getAllPageResults(jobId);

                if (allResults.length > 0) {
                    console.log(`[Batch] 📊 Aggregating ${allResults.length} page results...`);
                    const aggregated = aggregateAuditResults(allResults, allResults[0].url); // Use first URL as base?
                    const sortedPages = sortPagesBySeverity(allResults);

                    // Fetch current progress to get failed pages list
                    const finalProgress = await getProgress(jobId);
                    const failedPages = finalProgress ? finalProgress.pageResults.filter(p => p.status === 'failed') : [];

                    await saveFinalResult(jobId, {
                        aggregated,
                        sortedPages,
                        pageResults: allResults,
                        failedPages: failedPages.map(p => ({
                            url: p.url,
                            error: 'Audit failed', // We might need better error tracking in KV, but this is a start
                            errorType: 'unknown',
                            retryable: true
                        })),
                        isMockData: false
                    });
                    console.log(`[Batch] ✅ Final aggregation completed and saved.`);
                } else {
                    console.warn(`[Batch] ⚠️ No results found to aggregate.`);
                    await updateStatus(jobId, 'completed');
                }

            } catch (aggError: any) {
                console.error(`[Batch] ❌ Aggregation error:`, aggError);
                // Ensure we at least mark as completed so UI doesn't hang
                await updateStatus(jobId, 'completed');
            }
        }

        const totalFunctionDuration = Date.now() - functionStartTime;
        console.log(`[Batch] ⏱️ Total function duration: ${totalFunctionDuration}ms (Netlify limit: 26000ms)`);
        
        if (totalFunctionDuration > 24000) {
            console.warn(`[Batch] ⚠️ WARNING: Function took ${totalFunctionDuration}ms - close to Netlify 26s limit!`);
        }

        return NextResponse.json({
            status: 'processing',
            processed: currentBatchUrls.length,
            remaining: remainingPendingPages.length,
            totalPages: updatedProgress?.totalPages || progress.totalPages,
            completedPages: updatedProgress?.completedPages || progress.completedPages,
            currentBatch: currentBatchNumber,
            totalBatches: totalBatches,
            functionDuration: totalFunctionDuration
        });

    } catch (error: any) {
        const totalFunctionDuration = Date.now() - functionStartTime;
        console.error(`[Batch] ❌ Critical error after ${totalFunctionDuration}ms: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
