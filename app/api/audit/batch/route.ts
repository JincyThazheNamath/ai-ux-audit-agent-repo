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
        // Process only 2 pages per batch to ensure we finish well within 26s
        // Each page: ~8-10s max (page load + AI analysis + DB save)
        // 2 pages × 10s = 20s max, leaving 6s buffer for overhead
        const BATCH_SIZE = 2; // Reduced from 4 to fit safely in 26s Netlify limit
        const currentBatchUrls = pendingPages.slice(0, BATCH_SIZE);
        const totalBatches = Math.ceil(pendingPages.length / BATCH_SIZE);
        const currentBatchNumber = Math.ceil((progress.totalPages - pendingPages.length) / BATCH_SIZE) + 1;

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
                timeoutPerPage: 10000 // Reduced from 30s to 10s per page (8s page load + 2s AI analysis)
            });
        } catch (err: any) {
            console.error(`[Batch] ⚠️ Batch processing error: ${err.message}`);
        }
        
        const batchDuration = Date.now() - batchStartTime;
        console.log(`[Batch] ⏱️ Batch processing duration: ${batchDuration}ms`);

        // 5. Re-check progress to get accurate remaining count
        const updatedProgress = await getProgress(jobId);
        const remainingPendingPages = updatedProgress 
            ? updatedProgress.pageResults.filter(p => p.status === 'pending').map(p => p.url)
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
