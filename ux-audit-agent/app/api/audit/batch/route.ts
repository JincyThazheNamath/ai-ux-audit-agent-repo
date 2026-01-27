import { NextRequest, NextResponse } from 'next/server';
import { getProgress, updateStatus, updatePageProgress, saveFinalResult } from '../../../../../lib/progressTracker';
import { processBatches } from '../../../../../lib/batchProcessor';
import { aggregateAuditResults, sortPagesBySeverity } from '../../../../../lib/batchAuditor';

// Vercel serverless function configuration
export const maxDuration = 300; // 5 minutes max
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        console.log(`[Batch] 🚀 Processing batch for Job ID: ${jobId}`);

        // 1. Get current progress
        const progress = await getProgress(jobId);
        if (!progress) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // 2. Identify pending pages
        const pendingPages = progress.pageResults
            .filter(p => p.status === 'pending')
            .map(p => p.url);

        if (pendingPages.length === 0) {
            console.log(`[Batch] ✅ No pending pages. Checking if aggregation needed...`);

            // Check if finalResult already exists (aggregation already done)
            const hasFinalResult = !!(progress as any).finalResult;
            
            if (hasFinalResult) {
                console.log(`[Batch] ✅ Final result already exists. Job completed.`);
                if (progress.status !== 'completed') {
                    await updateStatus(jobId, 'completed');
                }
                return NextResponse.json({ status: 'completed', message: 'All pages processed' });
            }

            // No final result yet - need to aggregate
            console.log(`[Batch] 🔄 No final result found. Starting aggregation...`);
            
            try {
                await updateStatus(jobId, 'aggregating');
                
                // Clean up old Redis data before saving final result to prevent OOM
                const { cleanupOldRedisData } = await import('../../../../../lib/progressTracker');
                console.log(`[Batch] 🧹 Cleaning up old Redis data before saving final result...`);
                try {
                    await cleanupOldRedisData();
                } catch (cleanupError: any) {
                    console.warn(`[Batch] ⚠️ Cleanup warning:`, cleanupError.message);
                    // Continue even if cleanup fails
                }
                
                // Get all page results for aggregation
                const { getAllPageResults } = await import('../../../../../lib/progressTracker');
                const allResults = await getAllPageResults(jobId);

                if (allResults.length > 0) {
                    console.log(`[Batch] 📊 Aggregating ${allResults.length} page results...`);
                    
                    // Determine base URL: use the first page URL's origin, or the first URL itself
                    const baseUrl = allResults[0]?.url ? (() => {
                        try {
                            const urlObj = new URL(allResults[0].url);
                            return `${urlObj.protocol}//${urlObj.host}`;
                        } catch {
                            return allResults[0].url;
                        }
                    })() : 'unknown';
                    
                    const aggregated = aggregateAuditResults(allResults, baseUrl);
                    const sortedPages = sortPagesBySeverity(allResults);

                    // Get failed pages
                    const failedPages = progress.pageResults.filter(p => p.status === 'failed');

                    await saveFinalResult(jobId, {
                        aggregated,
                        sortedPages,
                        pageResults: allResults,
                        failedPages: failedPages.map(p => ({
                            url: p.url,
                            error: 'Audit failed',
                            errorType: 'unknown',
                            retryable: true
                        })),
                        isMockData: false
                    });
                    console.log(`[Batch] ✅ Final aggregation completed and saved.`);
                } else {
                    console.warn(`[Batch] ⚠️ No results found to aggregate.`);
                }

                await updateStatus(jobId, 'completed');
                console.log(`[Batch] ✅ Job marked as completed.`);
            } catch (aggError: any) {
                // Handle OOM errors specifically
                if (aggError.message && aggError.message.includes('OOM')) {
                    console.error(`[Batch] ❌ Redis OOM during aggregation`);
                    // Mark as completed anyway so UI doesn't hang
                    await updateStatus(jobId, 'completed');
                } else {
                    console.error(`[Batch] ❌ Aggregation error:`, aggError);
                    // Still mark as completed even if aggregation fails
                    await updateStatus(jobId, 'completed');
                }
            }

            return NextResponse.json({ status: 'completed', message: 'All pages processed' });
        }

        // 3. Define Batch Size
        // Netlify Pro has 26s timeout, so process 2 pages at a time to fit within timeout
        const BATCH_SIZE = 2; // Reduced for Netlify's 26s timeout limit
        const currentBatchUrls = pendingPages.slice(0, BATCH_SIZE);

        console.log(`[Batch] 📦 Processing ${currentBatchUrls.length} pages: ${currentBatchUrls.join(', ')}`);

        // 4. Process this batch
        // We use processBatches but with a config that processes JUST this chunk
        // Use try-catch to ensure we can trigger next batch even if this one fails partially
        try {
            await processBatches(currentBatchUrls, jobId, {
                batchSize: BATCH_SIZE,
                delayBetweenBatches: 0, // No delay needed within this small atomic batch
                delayBetweenRequests: 1000,
                maxRetries: 1,
                timeoutPerPage: 30000
            });
        } catch (err: any) {
            console.error(`[Batch] ⚠️ Batch processing error: ${err.message}`);
            // Continue to recursive step to ensure we don't get stuck
        }

        // 5. Re-check progress after processing to get accurate pending count
        const updatedProgress = await getProgress(jobId);
        if (!updatedProgress) {
            console.error(`[Batch] ❌ Could not get updated progress after batch processing`);
            return NextResponse.json({ error: 'Failed to get updated progress' }, { status: 500 });
        }

        const remainingPendingPages = updatedProgress.pageResults
            .filter(p => p.status === 'pending')
            .map(p => p.url);

        // 6. Recursive Call or Finalization
        if (remainingPendingPages.length > 0) {
            console.log(`[Batch] 🔄 triggering next batch (${remainingPendingPages.length} pages remaining)...`);

            // Construct the URL for the recursive call
            // Use same approach as site route for reliability
            const origin = new URL(request.url).origin;
            const nextBatchUrl = `${origin}/api/audit/batch`;

            console.log(`[Batch] 🔗 Next batch URL: ${nextBatchUrl}`);

            // CRITICAL FIX: Directly await the recursive call to ensure it executes
            // Since we process small batches (4 pages), this won't timeout
            // This is more reliable than waitUntil which may not execute
            try {
                console.log(`[Batch] 📞 Making recursive batch call...`);
                
                // Use Promise.race with timeout to prevent hanging
                const response = await Promise.race([
                    fetch(nextBatchUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jobId })
                    }),
                    new Promise<Response>((_, reject) => 
                        setTimeout(() => reject(new Error('Recursive call timeout after 20s')), 20000)
                    )
                ]);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[Batch] ❌ Recursive batch call failed: ${response.status} - ${errorText}`);
                } else {
                    const result = await response.json();
                    console.log(`[Batch] ✅ Recursive batch call succeeded:`, result);
                }
            } catch (e: any) {
                console.error(`[Batch] ❌ Error in recursive batch call:`, e.message);
                console.error(`[Batch] ⚠️ Will retry on next progress check or manual trigger`);
                // Don't throw - allow function to return so progress can be checked
            }
        } else {
            // No more pages, we are done - trigger aggregation
            console.log(`[Batch] ✅ All pages completed. Starting aggregation...`);
            
            try {
                await updateStatus(jobId, 'aggregating');
                
                // Clean up old Redis data before saving final result to prevent OOM
                const { cleanupOldRedisData } = await import('../../../../../lib/progressTracker');
                console.log(`[Batch] 🧹 Cleaning up old Redis data before saving final result...`);
                try {
                    await cleanupOldRedisData();
                } catch (cleanupError: any) {
                    console.warn(`[Batch] ⚠️ Cleanup warning:`, cleanupError.message);
                    // Continue even if cleanup fails
                }
                
                // Get all page results for aggregation
                const { getAllPageResults } = await import('../../../../../lib/progressTracker');
                const allResults = await getAllPageResults(jobId);

                if (allResults.length > 0) {
                    console.log(`[Batch] 📊 Aggregating ${allResults.length} page results...`);
                    
                    // Determine base URL: use the first page URL's origin, or the first URL itself
                    const baseUrl = allResults[0]?.url ? (() => {
                        try {
                            const urlObj = new URL(allResults[0].url);
                            return `${urlObj.protocol}//${urlObj.host}`;
                        } catch {
                            return allResults[0].url;
                        }
                    })() : 'unknown';
                    
                    const aggregated = aggregateAuditResults(allResults, baseUrl);
                    const sortedPages = sortPagesBySeverity(allResults);

                    // Get failed pages
                    const finalProgress = await getProgress(jobId);
                    const failedPages = finalProgress ? finalProgress.pageResults.filter(p => p.status === 'failed') : [];

                    await saveFinalResult(jobId, {
                        aggregated,
                        sortedPages,
                        pageResults: allResults,
                        failedPages: failedPages.map(p => ({
                            url: p.url,
                            error: 'Audit failed',
                            errorType: 'unknown',
                            retryable: true
                        })),
                        isMockData: false
                    });
                    console.log(`[Batch] ✅ Final aggregation completed and saved.`);
                } else {
                    console.warn(`[Batch] ⚠️ No results found to aggregate.`);
                }

                await updateStatus(jobId, 'completed');
                console.log(`[Batch] ✅ Job marked as completed.`);
            } catch (aggError: any) {
                // Handle OOM errors specifically
                if (aggError.message && aggError.message.includes('OOM')) {
                    console.error(`[Batch] ❌ Redis OOM during aggregation`);
                    // Mark as completed anyway so UI doesn't hang
                    await updateStatus(jobId, 'completed');
                } else {
                    console.error(`[Batch] ❌ Aggregation error:`, aggError);
                    // Still mark as completed even if aggregation fails
                    await updateStatus(jobId, 'completed');
                }
            }
        }

        return NextResponse.json({
            status: 'processing',
            processed: currentBatchUrls.length,
            remaining: remainingPendingPages.length,
            totalPages: updatedProgress.totalPages,
            completedPages: updatedProgress.completedPages,
            nextBatchTriggered: remainingPendingPages.length > 0
        });

    } catch (error: any) {
        console.error(`[Batch] ❌ Critical error: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
